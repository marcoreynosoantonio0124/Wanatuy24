import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { describeSchedule } from "@/lib/format";
import { buildRenterView } from "@/lib/renter-view";
import { UnitTimetable } from "@/components/unit-timetable";
import type { AgreementRow, AssetRow, PeriodRow } from "@/lib/database.types";

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
    />
  );
}
