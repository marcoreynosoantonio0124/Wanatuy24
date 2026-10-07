import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { describeSchedule } from "@/lib/format";
import { buildRenterView } from "@/lib/renter-view";
import { loadMessagesByPeriod, loadUnitDocuments } from "@/lib/renter-rentals";
import { UnitTimetable, type MonthProof } from "@/components/unit-timetable";
import type { AgreementRow, AssetRow, PeriodRow } from "@/lib/database.types";

const PROOF_BUCKET = "payment-proofs";

export const dynamic = "force-dynamic";

export default async function UnitTimetablePage({
  params,
}: PageProps<"/dashboard/unit/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS scopes this to the lessor who owns the agreement.
  const { data: agreementData } = await supabase
    .from("agreements")
    .select("*, asset:assets(label)")
    .eq("id", id)
    .maybeSingle();
  if (!agreementData) notFound();
  const agreement = agreementData as AgreementRow & {
    asset: Pick<AssetRow, "label"> | null;
  };

  const admin = createAdminClient();
  const [{ data: periodsData }, { data: paymentsData }, { data: smsData }] =
    await Promise.all([
      supabase
        .from("periods")
        .select("*")
        .eq("agreement_id", id)
        .order("due_date", { ascending: true }),
      supabase
        .from("payments")
        .select("period_id, amount_php")
        .eq("agreement_id", id),
      admin
        .from("notifications")
        .select("period_id, sent_at, template_key, body")
        .eq("agreement_id", id)
        .eq("channel", "sms")
        .eq("status", "sent")
        .order("sent_at", { ascending: false }),
    ]);

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const view = buildRenterView({
    periods: (periodsData ?? []) as PeriodRow[],
    payments: (paymentsData ?? []) as {
      period_id: string | null;
      amount_php: number;
    }[],
    sms: (smsData ?? []) as {
      period_id: string | null;
      sent_at: string | null;
      template_key: string | null;
      body: string | null;
    }[],
    today,
  });

  const collected = view.months.reduce((s, m) => s + m.paid, 0);
  const remindersSent = view.months.reduce((s, m) => s + m.reminders.length, 0);

  // Pending tenant proofs, shown on their month so the lessor can record them.
  const periodIds = ((periodsData ?? []) as PeriodRow[]).map((p) => p.id);
  const proofByPeriod: Record<string, MonthProof> = {};
  if (periodIds.length > 0) {
    const { data: proofRows } = await admin
      .from("payment_proofs")
      .select("period_id, amount_php, method, paid_on, file_path, status, created_at")
      .in("period_id", periodIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    for (const r of (proofRows ?? []) as {
      period_id: string;
      amount_php: number;
      method: string;
      paid_on: string;
      file_path: string | null;
    }[]) {
      if (proofByPeriod[r.period_id]) continue; // keep the most recent per month
      let viewUrl: string | null = null;
      if (r.file_path) {
        const { data: signed } = await admin.storage
          .from(PROOF_BUCKET)
          .createSignedUrl(r.file_path, 60 * 60);
        viewUrl = signed?.signedUrl ?? null;
      }
      proofByPeriod[r.period_id] = {
        amountCentavos: r.amount_php,
        method: r.method,
        paidOn: r.paid_on,
        viewUrl,
      };
    }
  }

  const messagesByPeriod = await loadMessagesByPeriod(admin, id);

  const isActive = agreement.status === "active";
  // Contract + both parties' valid IDs, shown inside the unit only while active.
  const documents = isActive
    ? await loadUnitDocuments(admin, {
        lessor_id: agreement.lessor_id,
        renter_user_id: agreement.renter_user_id,
        contract_file_path: agreement.contract_file_path,
        renter_id_file_path: agreement.renter_id_file_path,
      })
    : null;

  return (
    <UnitTimetable
      agreementId={id}
      unitLabel={agreement.asset?.label ?? "Unit"}
      renterName={agreement.renter_name}
      scheduleLabel={describeSchedule(agreement.frequency, agreement.due_day)}
      months={view.months}
      collected={collected}
      outstanding={view.outstanding}
      remindersSent={remindersSent}
      interactive
      proofByPeriod={proofByPeriod}
      messagesByPeriod={messagesByPeriod}
      transactionNo={agreement.transaction_no ?? null}
      isActive={isActive}
      documents={documents}
    />
  );
}
