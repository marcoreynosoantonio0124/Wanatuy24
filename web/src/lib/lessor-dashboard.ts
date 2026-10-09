import type { SupabaseClient } from "@supabase/supabase-js";
import { buildLedger } from "@/lib/ledger";
import { createAdminClient } from "@/lib/supabase/server";
import { signUnitCover } from "@/lib/unit-photos";
import type { PeriodRow } from "@/lib/database.types";

/** One month that still needs attention within a property. */
export type AttentionRow = {
  periodId: string;
  dueDate: string;
  remaining: number;
  tone: "overdue" | "due" | "partial";
  proof: boolean;
  reminderCount: number;
  reminderLast: string | null;
};

export type Property = {
  id: string;
  name: string; // unit / property label
  tenant: string;
  monthly: number;
  owed: number;
  overdueCount: number;
  proofCount: number;
  allPaid: boolean;
  attention: AttentionRow[];
  nextDue: string | null;
  lastPaid: string | null;
  transactionNo: string | null;
  /** A property with no active agreement — "Open for leasing" (inactive). */
  vacant: boolean;
  /** The underlying asset id (used for vacant units + delete/retain). */
  assetId: string;
  /** Signed URL to the unit's cover photo, if any (shown on the card). */
  coverPhoto: string | null;
  /** How many photos the unit has. */
  photoCount: number;
};

export type LessorDashboard = {
  properties: Property[];
  outstanding: number;
  proofsToReview: number;
  anyOverdue: number | boolean;
};

type AgreementLite = {
  id: string;
  renter_name: string;
  amount_php: number;
  transaction_no: string | null;
  asset_id: string;
  asset: { label: string; photo_paths: string[] | null } | null;
};

/**
 * Loads and computes a lessor's whole dashboard (property folders + totals).
 *
 * Pass the request-scoped client for the signed-in lessor (RLS scopes the rows
 * to them), or the service-role admin client together with `lessorId` to look
 * into a specific landlord's dashboard for monitoring. `lessorId` is required
 * with the admin client, which bypasses RLS and would otherwise read everyone.
 */
export async function loadLessorDashboard(
  client: SupabaseClient,
  opts: { lessorId?: string } = {},
): Promise<LessorDashboard> {
  let agQuery = client
    .from("agreements")
    .select(
      "id, renter_name, amount_php, transaction_no, asset_id, asset:assets(label, photo_paths)",
    )
    .eq("status", "active");
  if (opts.lessorId) agQuery = agQuery.eq("lessor_id", opts.lessorId);

  const { data: agData } = await agQuery.order("created_at", {
    ascending: true,
  });
  const ags = (agData ?? []) as unknown as AgreementLite[];
  const agIds = ags.map((a) => a.id);

  const [periodsRes, paymentsRes, smsRes] = await Promise.all([
    agIds.length
      ? client
          .from("periods")
          .select("id, agreement_id, due_date, amount_php, status")
          .in("agreement_id", agIds)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    agIds.length
      ? client
          .from("payments")
          .select("agreement_id, period_id, amount_php")
          .in("agreement_id", agIds)
      : Promise.resolve({ data: [] as unknown[] }),
    agIds.length
      ? client
          .from("notifications")
          .select("period_id, sent_at")
          .in("agreement_id", agIds)
          .eq("channel", "sms")
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const allPeriods = (periodsRes.data ?? []) as (PeriodRow & {
    agreement_id: string;
  })[];
  const allPayments = (paymentsRes.data ?? []) as {
    agreement_id: string;
    period_id: string | null;
    amount_php: number;
  }[];
  const allSms = (smsRes.data ?? []) as {
    period_id: string | null;
    sent_at: string | null;
  }[];

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const paymentsByAgreement = new Map<
    string,
    { period_id: string | null; amount_php: number }[]
  >();
  for (const p of allPayments) {
    const list = paymentsByAgreement.get(p.agreement_id) ?? [];
    list.push({ period_id: p.period_id, amount_php: p.amount_php });
    paymentsByAgreement.set(p.agreement_id, list);
  }

  // Reminder text count + latest date, per month.
  const smsByPeriod = new Map<string, { count: number; last: string | null }>();
  for (const n of allSms) {
    if (!n.period_id) continue;
    const prev = smsByPeriod.get(n.period_id);
    if (prev) prev.count += 1;
    else smsByPeriod.set(n.period_id, { count: 1, last: n.sent_at });
  }

  const statusByPeriod = new Map<string, string>();
  for (const p of allPeriods) statusByPeriod.set(p.id, p.status);

  const properties: Property[] = ags.map((a) => {
    const ps = allPeriods.filter((p) => p.agreement_id === a.id);
    const ledger = buildLedger(ps, paymentsByAgreement.get(a.id) ?? [], today);

    const attention: AttentionRow[] = [];
    let overdueCount = 0;
    let proofCount = 0;
    let nextDue: string | null = null;
    let lastPaid: string | null = null;

    for (const r of ledger.rows) {
      if (r.status === "waived") continue;
      const periodStatus = statusByPeriod.get(r.period.id) ?? "";
      const proof = periodStatus === "proof_submitted";
      if (proof) proofCount += 1;
      if (r.status === "paid") {
        if (r.period.due_date <= today) lastPaid = r.period.due_date;
        continue;
      }
      if (r.remaining > 0 && r.period.due_date <= today) {
        const tone: AttentionRow["tone"] = r.overdue
          ? "overdue"
          : r.status === "partial"
            ? "partial"
            : "due";
        if (tone === "overdue") overdueCount += 1;
        const sms = smsByPeriod.get(r.period.id);
        attention.push({
          periodId: r.period.id,
          dueDate: r.period.due_date,
          remaining: r.remaining,
          tone,
          proof,
          reminderCount: sms?.count ?? 0,
          reminderLast: sms?.last ?? null,
        });
      } else if (r.remaining > 0 && !nextDue && r.period.due_date > today) {
        nextDue = r.period.due_date;
      }
    }

    return {
      id: a.id,
      name: a.asset?.label ?? "Unit",
      tenant: a.renter_name,
      monthly: a.amount_php,
      owed: ledger.outstanding,
      overdueCount,
      proofCount,
      allPaid: ledger.outstanding === 0,
      attention,
      nextDue,
      lastPaid,
      transactionNo: a.transaction_no ?? null,
      vacant: false,
      assetId: a.asset_id,
      coverPhoto: null,
      photoCount: a.asset?.photo_paths?.length ?? 0,
    };
  });

  // Remember each asset's photo paths so we can sign covers in one pass below.
  const pathsByAsset = new Map<string, string[]>();
  for (const a of ags) {
    if (a.asset?.photo_paths?.length) pathsByAsset.set(a.asset_id, a.asset.photo_paths);
  }

  // Needs-attention properties first (most owed first), paid-up last.
  properties.sort(
    (x, y) => Number(x.allPaid) - Number(y.allPaid) || y.owed - x.owed,
  );

  // Vacant units: the lessor's non-archived properties that have no active
  // agreement right now — shown as "Open for leasing" (inactive), after the
  // occupied ones.
  let assetQuery = client
    .from("assets")
    .select("id, label, photo_paths")
    .is("archived_at", null);
  if (opts.lessorId) assetQuery = assetQuery.eq("lessor_id", opts.lessorId);
  const { data: assetData } = await assetQuery.order("created_at", {
    ascending: true,
  });
  const occupied = new Set(ags.map((a) => a.asset_id));
  for (const asset of (assetData ?? []) as {
    id: string;
    label: string;
    photo_paths: string[] | null;
  }[]) {
    if (occupied.has(asset.id)) continue;
    if (asset.photo_paths?.length) pathsByAsset.set(asset.id, asset.photo_paths);
    properties.push({
      id: asset.id,
      name: asset.label,
      tenant: "",
      monthly: 0,
      owed: 0,
      overdueCount: 0,
      proofCount: 0,
      allPaid: true,
      attention: [],
      nextDue: null,
      lastPaid: null,
      transactionNo: null,
      vacant: true,
      assetId: asset.id,
      coverPhoto: null,
      photoCount: asset.photo_paths?.length ?? 0,
    });
  }

  // Sign cover photos for every property that has one (service-role; the
  // bucket is private). Done once, after the list is assembled.
  if (pathsByAsset.size > 0) {
    const admin = createAdminClient();
    await Promise.all(
      properties.map(async (p) => {
        const paths = pathsByAsset.get(p.assetId);
        if (paths?.length) p.coverPhoto = await signUnitCover(admin, paths);
      }),
    );
  }

  const outstanding = properties.reduce((s, p) => s + p.owed, 0);
  const proofsToReview = properties.reduce((s, p) => s + p.proofCount, 0);
  const anyOverdue = properties.some((p) => p.overdueCount > 0);

  return { properties, outstanding, proofsToReview, anyOverdue };
}
