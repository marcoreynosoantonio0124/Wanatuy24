import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { describeSchedule } from "@/lib/format";
import { buildRenterView } from "@/lib/renter-view";
import { RenterDashboard } from "@/components/renter-dashboard";
import { PageWallpaper } from "@/components/page-wallpaper";
import type {
  AgreementRow,
  PaymentMethod,
  PeriodRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Agreement = Pick<
  AgreementRow,
  | "id"
  | "renter_name"
  | "frequency"
  | "due_day"
  | "payment_instructions"
  | "accepted_payment_methods"
  | "renter_access_token"
  | "asset_id"
  | "contract_file_path"
> & { renter_id_file_path: string | null };

const CONTRACT_BUCKET = "contracts";

export default async function MyRentalsPage() {
  const { user, supabase } = await requireUser();

  // Founder / admin accounts are monitoring-only — send them to the Command Center.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((me as { is_admin?: boolean } | null)?.is_admin) redirect("/admin");

  const { data: agData } = await supabase
    .from("agreements")
    .select(
      "id, renter_name, frequency, due_day, payment_instructions, accepted_payment_methods, renter_access_token, asset_id, contract_file_path, renter_id_file_path",
    )
    .eq("renter_user_id", user.id)
    .order("created_at", { ascending: false });
  const agreements = (agData ?? []) as unknown as Agreement[];

  if (agreements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600">Wala pang naka-link na rental.</p>
        <p className="mt-1 text-sm text-slate-400">
          Ask your landlord to add your email ({user.email}) to your agreement,
          then sign in again — it will show up here automatically.
        </p>
      </div>
    );
  }

  const ids = agreements.map((a) => a.id);
  const assetIds = [...new Set(agreements.map((a) => a.asset_id))];
  const admin = createAdminClient();

  const [{ data: assetRows }, { data: perData }, { data: payData }, { data: smsData }] =
    await Promise.all([
      admin.from("assets").select("id, label, address_text").in("id", assetIds),
      admin.from("periods").select("*").in("agreement_id", ids),
      admin
        .from("payments")
        .select("agreement_id, period_id, amount_php")
        .in("agreement_id", ids),
      admin
        .from("notifications")
        .select("agreement_id, period_id, sent_at, template_key, body")
        .in("agreement_id", ids)
        .eq("channel", "sms")
        .eq("status", "sent")
        .order("sent_at", { ascending: false }),
    ]);

  const assetById = new Map(
    (
      (assetRows ?? []) as {
        id: string;
        label: string;
        address_text: string | null;
      }[]
    ).map((a) => [a.id, a]),
  );

  const periodsByAg = new Map<string, PeriodRow[]>();
  for (const p of (perData ?? []) as (PeriodRow & { agreement_id: string })[]) {
    const arr = periodsByAg.get(p.agreement_id) ?? [];
    arr.push(p);
    periodsByAg.set(p.agreement_id, arr);
  }
  const payByAg = new Map<string, { period_id: string | null; amount_php: number }[]>();
  for (const p of (payData ?? []) as {
    agreement_id: string;
    period_id: string | null;
    amount_php: number;
  }[]) {
    const arr = payByAg.get(p.agreement_id) ?? [];
    arr.push({ period_id: p.period_id, amount_php: p.amount_php });
    payByAg.set(p.agreement_id, arr);
  }
  const smsByAg = new Map<
    string,
    {
      period_id: string | null;
      sent_at: string | null;
      template_key: string | null;
      body: string | null;
    }[]
  >();
  for (const n of (smsData ?? []) as {
    agreement_id: string;
    period_id: string | null;
    sent_at: string | null;
    template_key: string | null;
    body: string | null;
  }[]) {
    const arr = smsByAg.get(n.agreement_id) ?? [];
    arr.push(n);
    smsByAg.set(n.agreement_id, arr);
  }

  // Signed contract links per agreement.
  const contractByAg = new Map<
    string,
    { view: string | null; download: string | null }
  >();
  await Promise.all(
    agreements
      .filter((a) => a.contract_file_path)
      .map(async (a) => {
        const [{ data: cv }, { data: cd }] = await Promise.all([
          admin.storage
            .from(CONTRACT_BUCKET)
            .createSignedUrl(a.contract_file_path as string, 60 * 60),
          admin.storage
            .from(CONTRACT_BUCKET)
            .createSignedUrl(a.contract_file_path as string, 60 * 60, {
              download: true,
            }),
        ]);
        contractByAg.set(a.id, {
          view: cv?.signedUrl ?? null,
          download: cd?.signedUrl ?? null,
        });
      }),
  );

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="-mx-4 -my-8 space-y-8">
      <PageWallpaper />
      {agreements.map((a) => {
        const asset = assetById.get(a.asset_id);
        const view = buildRenterView({
          periods: periodsByAg.get(a.id) ?? [],
          payments: payByAg.get(a.id) ?? [],
          sms: smsByAg.get(a.id) ?? [],
          today,
        });
        return (
          <RenterDashboard
            key={a.id}
            token={a.renter_access_token}
            firstName={a.renter_name.split(" ")[0] || "there"}
            unitLabel={asset?.label ?? "Your rental"}
            address={asset?.address_text ?? null}
            scheduleLabel={describeSchedule(a.frequency, a.due_day)}
            outstanding={view.outstanding}
            dueNow={view.dueNow}
            months={view.months}
            unpaidForProof={view.unpaidForProof}
            methods={a.accepted_payment_methods as PaymentMethod[]}
            paymentInstructions={a.payment_instructions}
            contract={contractByAg.get(a.id) ?? null}
            hasRenterId={Boolean(a.renter_id_file_path)}
          />
        );
      })}
    </div>
  );
}
