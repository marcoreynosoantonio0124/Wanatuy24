import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/webpush";
import { formatPeso } from "@/lib/format";
import type { AgreementRow, PeriodRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled job. Trigger it with either:
 *   - Vercel Cron (GET; sends `Authorization: Bearer $CRON_SECRET` automatically), or
 *   - any scheduler (GitHub Actions, pg_cron+pg_net) sending `x-cron-secret`.
 * It extends the period horizon, advances statuses, materializes reminder rows
 * from each agreement's reminder_schedule, and delivers due ones over Web Push.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unset (e.g. local) — allow
  if (request.headers.get("x-cron-secret") === secret) return true;
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1) Extend horizon + advance statuses (set-based, in SQL).
  const until = new Date();
  until.setMonth(until.getMonth() + 18);
  await admin.rpc("generate_all_periods", {
    p_until: until.toISOString().slice(0, 10),
  });
  await admin.rpc("refresh_period_statuses");

  // 2) Materialize reminder notifications for periods in a ±window.
  const created = await materializeNotifications(admin);

  // 3) Deliver due push notifications.
  const delivery = await deliverDuePush(admin);

  return NextResponse.json({ ok: true, notificationsCreated: created, ...delivery });
}

type Admin = ReturnType<typeof createAdminClient>;

const WINDOW_BACK_DAYS = 7;
const WINDOW_FWD_DAYS = 40;

async function materializeNotifications(admin: Admin): Promise<number> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - WINDOW_BACK_DAYS);
  const to = new Date(today);
  to.setDate(to.getDate() + WINDOW_FWD_DAYS);

  const { data } = await admin
    .from("periods")
    .select(
      "id, due_date, agreement_id, status, agreement:agreements(reminder_schedule, reminder_time_local, status)",
    )
    .in("status", ["upcoming", "due", "overdue"])
    .gte("due_date", from.toISOString().slice(0, 10))
    .lte("due_date", to.toISOString().slice(0, 10));

  type Row = Pick<PeriodRow, "id" | "due_date" | "agreement_id"> & {
    agreement: Pick<
      AgreementRow,
      "reminder_schedule" | "reminder_time_local" | "status"
    > | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const toInsert: Record<string, unknown>[] = [];
  for (const p of rows) {
    const a = p.agreement;
    if (!a || a.status !== "active") continue;
    const offsets = Array.isArray(a.reminder_schedule) ? a.reminder_schedule : [];
    const time = (a.reminder_time_local ?? "09:00:00").slice(0, 8).padEnd(8, ":00");
    for (const offset of offsets) {
      const when = manilaInstant(p.due_date, offset, time);
      toInsert.push({
        agreement_id: p.agreement_id,
        period_id: p.id,
        recipient: "renter",
        channel: "push",
        template_key: templateKey(offset),
        scheduled_for: when,
        status: "scheduled",
        dedupe_key: `${p.id}:${offset}:push`,
      });
    }
  }

  if (toInsert.length === 0) return 0;
  const { error } = await admin
    .from("notifications")
    .upsert(toInsert, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) return 0;
  return toInsert.length;
}

async function deliverDuePush(admin: Admin) {
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("notifications")
    .select(
      "id, agreement_id, period_id, template_key, period:periods(due_date, amount_php), agreement:agreements(renter_name, renter_user_id, asset:assets(label))",
    )
    .eq("status", "scheduled")
    .eq("channel", "push")
    .lte("scheduled_for", nowIso)
    .limit(200);

  type Row = {
    id: string;
    agreement_id: string;
    template_key: string;
    period: { due_date: string; amount_php: number } | null;
    agreement: {
      renter_name: string;
      renter_user_id: string | null;
      asset: { label: string } | null;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  let sent = 0;
  let failed = 0;
  for (const n of rows) {
    const subs = await subscriptionsFor(admin, n.agreement_id, n.agreement?.renter_user_id ?? null);
    if (subs.length === 0) {
      await admin.from("notifications").update({ status: "skipped" }).eq("id", n.id);
      continue;
    }
    const amount = n.period ? formatPeso(n.period.amount_php) : "";
    const label = n.agreement?.asset?.label ?? "your rental";
    const payload = {
      title: "Rent reminder",
      body: `${amount} for ${label} — ${dueText(n.template_key)}.`,
      url: "/dashboard",
      tag: n.id,
    };

    let anySent = false;
    for (const s of subs) {
      const result = await sendPush(s, payload);
      if (result === "sent") anySent = true;
      if (result === "gone") {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    if (anySent) {
      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      sent++;
    } else {
      await admin.from("notifications").update({ status: "failed" }).eq("id", n.id);
      failed++;
    }
  }
  return { pushSent: sent, pushFailed: failed };
}

async function subscriptionsFor(
  admin: Admin,
  agreementId: string,
  renterUserId: string | null,
) {
  const filter = renterUserId
    ? `agreement_id.eq.${agreementId},user_id.eq.${renterUserId}`
    : `agreement_id.eq.${agreementId}`;
  const { data } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .or(filter);
  return (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
}

/** Build the UTC instant for (due_date + offset days) at a Manila wall-clock time. */
function manilaInstant(dueDate: string, offset: number, time: string): string {
  const base = new Date(`${dueDate}T${time}+08:00`);
  base.setDate(base.getDate() + offset);
  return base.toISOString();
}

function templateKey(offset: number): string {
  if (offset < 0) return "rent_due_soon";
  if (offset === 0) return "rent_due_today";
  return "rent_overdue";
}

function dueText(key: string): string {
  switch (key) {
    case "rent_due_today":
      return "due today";
    case "rent_overdue":
      return "now overdue";
    default:
      return "due soon";
  }
}
