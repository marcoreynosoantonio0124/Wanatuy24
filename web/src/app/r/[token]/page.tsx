import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { describeSchedule } from "@/lib/format";
import { buildRenterView } from "@/lib/renter-view";
import { RenterDashboard } from "@/components/renter-dashboard";
import { AmbientBackground } from "@/components/ambient-background";
import { currentPhaseManila } from "@/lib/time-theme";
import type { AgreementRow, AssetRow, PeriodRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const CONTRACT_BUCKET = "contracts";

export default async function RenterPortalPage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: agreementData } = await admin
    .from("agreements")
    .select("*, asset:assets(label, type, address_text)")
    .eq("renter_access_token", token)
    .maybeSingle();
  if (!agreementData) notFound();
  const agreement = agreementData as AgreementRow & {
    renter_id_file_path?: string | null;
    asset: Pick<AssetRow, "label" | "type" | "address_text"> | null;
  };

  const [{ data: periodsData }, { data: paymentsData }, { data: smsData }] =
    await Promise.all([
      admin
        .from("periods")
        .select("*")
        .eq("agreement_id", agreement.id)
        .order("due_date", { ascending: true }),
      admin
        .from("payments")
        .select("period_id, amount_php")
        .eq("agreement_id", agreement.id),
      admin
        .from("notifications")
        .select("period_id, sent_at, template_key, body")
        .eq("agreement_id", agreement.id)
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

  // Signed links for the contract (renter sees only their own).
  let contract: { view: string | null; download: string | null } | null = null;
  if (agreement.contract_file_path) {
    const [{ data: cv }, { data: cd }] = await Promise.all([
      admin.storage
        .from(CONTRACT_BUCKET)
        .createSignedUrl(agreement.contract_file_path, 60 * 60),
      admin.storage
        .from(CONTRACT_BUCKET)
        .createSignedUrl(agreement.contract_file_path, 60 * 60, {
          download: true,
        }),
    ]);
    contract = { view: cv?.signedUrl ?? null, download: cd?.signedUrl ?? null };
  }

  return (
    <div className="app-dark relative isolate min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
    <AmbientBackground initialPhase={currentPhaseManila()} />
    <div className="relative z-10">
    <RenterDashboard
      token={token}
      firstName={agreement.renter_name.split(" ")[0] || "there"}
      unitLabel={agreement.asset?.label ?? "Your rental"}
      address={agreement.asset?.address_text ?? null}
      scheduleLabel={describeSchedule(agreement.frequency, agreement.due_day)}
      outstanding={view.outstanding}
      dueNow={view.dueNow}
      months={view.months}
      unpaidForProof={view.unpaidForProof}
      methods={agreement.accepted_payment_methods}
      paymentInstructions={agreement.payment_instructions}
      contract={contract}
      hasRenterId={Boolean(agreement.renter_id_file_path)}
    />
    </div>
    </div>
  );
}
