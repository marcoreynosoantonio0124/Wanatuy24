import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPeso,
  formatDate,
  describeSchedule,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import { buildLedger } from "@/lib/ledger";
import { LedgerPill } from "@/components/ledger-pill";
import { RenterProofForm } from "@/components/renter-proof-form";
import { RenterPushToggle } from "@/components/renter-push-toggle";
import { ReminderBadge, type ReminderRecord } from "@/components/reminder-badge";
import { reminderKindLabel } from "@/lib/sms";
import type {
  AgreementRow,
  AssetRow,
  PeriodRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function RenterPortalPage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: agreementData } = await admin
    .from("agreements")
    .select("*, asset:assets(label, type)")
    .eq("renter_access_token", token)
    .maybeSingle();

  if (!agreementData) notFound();
  const agreement = agreementData as AgreementRow & {
    asset: Pick<AssetRow, "label" | "type"> | null;
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
        .select("period_id, sent_at")
        .eq("agreement_id", agreement.id)
        .eq("channel", "sms")
        .eq("status", "sent")
        .order("sent_at", { ascending: false }),
    ]);
  const periods = (periodsData ?? []) as PeriodRow[];
  const payments = (paymentsData ?? []) as {
    period_id: string | null;
    amount_php: number;
  }[];

  // Reminder texts sent per month, so the tenant sees the same record the
  // lessor does (most recent first).
  const periodIds = periods.map((p) => p.id);
  const { data: smsData } = periodIds.length
    ? await admin
        .from("notifications")
        .select("period_id, sent_at, template_key, body")
        .in("period_id", periodIds)
        .eq("channel", "sms")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
    : { data: [] };
  const remindersByPeriod = new Map<string, ReminderRecord[]>();
  for (const n of (smsData ?? []) as {
    period_id: string | null;
    sent_at: string | null;
    template_key: string | null;
    body: string | null;
  }[]) {
    if (!n.period_id || !n.sent_at) continue;
    const list = remindersByPeriod.get(n.period_id) ?? [];
    list.push({
      sentAt: n.sent_at,
      label: reminderKindLabel(n.template_key ?? ""),
      body: n.body ?? "",
    });
    remindersByPeriod.set(n.period_id, list);
  }

  const unpaid = periods.filter((p) =>
    ["upcoming", "due", "overdue"].includes(p.status),
  );
  const nextDue = unpaidRows[0];

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <p className="text-sm font-semibold text-emerald-700">DueMeet</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Hi {agreement.renter_name.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-slate-500">
        {agreement.asset?.label ?? "Your rental"} ·{" "}
        {describeSchedule(agreement.frequency, agreement.due_day)}
      </p>

      {nextDue && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            {nextDue.allocated > 0 ? "Balance on this month" : "Next payment"}
          </p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatPeso(nextDue.remaining)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Due {formatDate(nextDue.period.due_date)}
            {nextDue.allocated > 0 && (
              <span className="text-emerald-600">
                {" "}
                · {formatPeso(nextDue.allocated)} already received
              </span>
            )}
          </p>
        </div>
      )}

      {agreement.payment_instructions && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">How to pay</p>
          <p className="mt-1 whitespace-pre-wrap">
            {agreement.payment_instructions}
          </p>
          <p className="mt-2 text-emerald-700">
            Accepts:{" "}
            {agreement.accepted_payment_methods
              .map((m) => PAYMENT_METHOD_LABELS[m])
              .join(", ")}
          </p>
        </div>
      )}

      <div className="mt-4">
        <RenterPushToggle token={token} />
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Submit a payment
        </h2>
        {unpaidRows.length > 0 ? (
          <RenterProofForm
            token={token}
            periods={unpaidRows.map((r) => ({
              id: r.period.id,
              due_date: r.period.due_date,
              amount_php: r.remaining,
            }))}
            methods={agreement.accepted_payment_methods}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            You&apos;re all paid up. 🎉
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your payment record
        </h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {periods.map((p) => {
            const reminders = remindersByPeriod.get(p.id) ?? [];
            return (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{formatDate(p.due_date)}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-slate-500">
                      {formatPeso(p.amount_php)}
                    </span>
                    <PeriodStatusBadge status={p.status} />
                  </span>
                </div>
                {reminders.length > 0 && (
                  <ReminderBadge
                    records={reminders}
                    monthLabel={formatDate(p.due_date)}
                    audience="tenant"
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            Balance up to date
          </span>
          <span className="text-lg font-bold text-amber-700">
            {formatPeso(ledger.outstanding)}
          </span>
        </div>
      </section>
    </main>
  );
}
