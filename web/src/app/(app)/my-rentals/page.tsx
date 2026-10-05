import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPeso,
  formatDate,
  describeSchedule,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import { LedgerPill } from "@/components/ledger-pill";
import { RenterProofForm } from "@/components/renter-proof-form";
import { DuskScene } from "@/components/dusk-scene";
import { buildLedger } from "@/lib/ledger";
import type { AgreementRow, PaymentMethod, PeriodRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Agreement = Pick<
  AgreementRow,
  | "id"
  | "renter_name"
  | "amount_php"
  | "frequency"
  | "due_day"
  | "status"
  | "payment_instructions"
  | "accepted_payment_methods"
  | "renter_access_token"
  | "asset_id"
  | "contract_file_path"
>;

export default async function MyRentalsPage() {
  const { user, supabase } = await requireUser();

  const { data: agData } = await supabase
    .from("agreements")
    .select(
      "id, renter_name, amount_php, frequency, due_day, status, payment_instructions, accepted_payment_methods, renter_access_token, asset_id, contract_file_path",
    )
    .eq("renter_user_id", user.id)
    .order("created_at", { ascending: false });
  const agreements = (agData ?? []) as unknown as Agreement[];

  // Renters can't read the assets table via RLS, so fetch labels server-side
  // (already scoped to this renter's own agreements above).
  const labelById = new Map<string, string>();
  const assetIds = [...new Set(agreements.map((a) => a.asset_id))];
  if (assetIds.length) {
    const admin = createAdminClient();
    const { data: assetRows } = await admin
      .from("assets")
      .select("id, label")
      .in("id", assetIds);
    for (const row of (assetRows ?? []) as { id: string; label: string }[]) {
      labelById.set(row.id, row.label);
    }
  }

  // Signed links to each rental's contract (renter sees only their own).
  const contractLinks = new Map<string, { view: string | null; download: string | null }>();
  const withContract = agreements.filter((a) => a.contract_file_path);
  if (withContract.length) {
    const admin = createAdminClient();
    await Promise.all(
      withContract.map(async (a) => {
        const [{ data: v }, { data: d }] = await Promise.all([
          admin.storage
            .from("contracts")
            .createSignedUrl(a.contract_file_path as string, 60 * 60),
          admin.storage
            .from("contracts")
            .createSignedUrl(a.contract_file_path as string, 60 * 60, {
              download: true,
            }),
        ]);
        contractLinks.set(a.id, {
          view: v?.signedUrl ?? null,
          download: d?.signedUrl ?? null,
        });
      }),
    );
  }

  const ids = agreements.map((a) => a.id);
  const { data: perData } = ids.length
    ? await supabase
        .from("periods")
        .select("*")
        .in("agreement_id", ids)
        .order("due_date", { ascending: true })
    : { data: [] };
  const periods = (perData ?? []) as PeriodRow[];
  const byAgreement = new Map<string, PeriodRow[]>();
  for (const p of periods) {
    const arr = byAgreement.get(p.agreement_id) ?? [];
    arr.push(p);
    byAgreement.set(p.agreement_id, arr);
  }

  // Payments drive the per-month Paid / Remaining figures (same math the lessor
  // sees). Fetched via admin, scoped to this renter's own agreements above.
  const paymentsByAgreement = new Map<
    string,
    { period_id: string | null; amount_php: number }[]
  >();
  if (ids.length) {
    const admin = createAdminClient();
    const { data: payData } = await admin
      .from("payments")
      .select("agreement_id, period_id, amount_php")
      .in("agreement_id", ids);
    for (const p of (payData ?? []) as {
      agreement_id: string;
      period_id: string | null;
      amount_php: number;
    }[]) {
      const arr = paymentsByAgreement.get(p.agreement_id) ?? [];
      arr.push({ period_id: p.period_id, amount_php: p.amount_php });
      paymentsByAgreement.set(p.agreement_id, arr);
    }
  }

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* banner */}
      <section className="relative min-h-[160px] overflow-hidden rounded-2xl ring-1 ring-slate-900/10">
        <DuskScene
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/25" />
        <div className="relative p-6 sm:p-8">
          <p className="text-sm font-medium text-emerald-300">My rentals</p>
          <h1 className="mt-1 text-2xl font-bold text-white drop-shadow sm:text-3xl">
            Your payment records
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/75">
            Read-only view — see every due date, send your proof of payment, and
            keep a record of what you&apos;ve paid.
          </p>
        </div>
      </section>

      {agreements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Wala pang naka-link na rental.</p>
          <p className="mt-1 text-sm text-slate-400">
            Ask your landlord to add your email ({user.email}) to your agreement,
            then sign in again — it will show up here automatically.
          </p>
        </div>
      ) : (
        agreements.map((a) => {
          const ps = byAgreement.get(a.id) ?? [];
          const ledger = buildLedger(
            ps,
            paymentsByAgreement.get(a.id) ?? [],
            today,
          );
          const unpaidRows = ledger.rows.filter(
            (r) => r.status !== "waived" && r.remaining > 0,
          );
          return (
            <section
              key={a.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {labelById.get(a.asset_id) ?? "Rental"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {formatPeso(a.amount_php)} ·{" "}
                    {describeSchedule(a.frequency, a.due_day)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Total paid: {formatPeso(ledger.collected)}
                </span>
              </div>

              {a.payment_instructions && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-medium">How to pay</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {a.payment_instructions}
                  </p>
                  <p className="mt-2 text-emerald-700">
                    Accepts:{" "}
                    {(a.accepted_payment_methods as PaymentMethod[])
                      .map((m) => PAYMENT_METHOD_LABELS[m])
                      .join(", ")}
                  </p>
                </div>
              )}

              {a.contract_file_path && contractLinks.get(a.id) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    📄 Your signed contract
                  </span>
                  <span className="flex gap-2">
                    {contractLinks.get(a.id)?.view && (
                      <a
                        href={contractLinks.get(a.id)!.view!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white active:scale-95"
                      >
                        View
                      </a>
                    )}
                    {contractLinks.get(a.id)?.download && (
                      <a
                        href={contractLinks.get(a.id)!.download!}
                        className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 active:scale-95"
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </span>
                </div>
              )}

              {/* payment records */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Payment records
                </h3>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {ledger.rows.map((r) => (
                    <li key={r.period.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">
                          {formatDate(r.period.due_date)}
                        </span>
                        <LedgerPill row={r} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>Due {formatPeso(r.due)}</span>
                        {r.allocated > 0 && (
                          <span className="text-emerald-600">
                            Paid {formatPeso(r.allocated)}
                          </span>
                        )}
                        {r.remaining > 0 && r.status !== "waived" && (
                          <span className="text-amber-700">
                            {formatPeso(r.remaining)} left
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-700">
                    Balance up to date
                  </span>
                  <span className="text-base font-bold text-amber-700">
                    {formatPeso(ledger.outstanding)}
                  </span>
                </div>
              </div>

              {/* submit proof */}
              {unpaidRows.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Send proof of payment
                  </h3>
                  <RenterProofForm
                    token={a.renter_access_token}
                    periods={unpaidRows.map((r) => ({
                      id: r.period.id,
                      due_date: r.period.due_date,
                      amount_php: r.remaining,
                    }))}
                    methods={a.accepted_payment_methods as PaymentMethod[]}
                  />
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
