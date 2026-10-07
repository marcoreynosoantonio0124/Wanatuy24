import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { buildRenterView } from "@/lib/renter-view";
import { describeSchedule } from "@/lib/format";
import type {
  PeriodRow,
  PaymentMethod,
  AgreementFrequency,
} from "@/lib/database.types";
import type { ForecastMonth } from "@/components/year-forecast";

/** One rental (apartment) in the renter's records list. */
export type RenterRentalRow = {
  id: string;
  unitLabel: string;
  address: string | null;
  monthly: number;
  outstanding: number;
  overdueCount: number;
  allPaid: boolean;
};

export type RenterRentalsData = {
  rentals: RenterRentalRow[];
  totalOutstanding: number;
  activeCount: number;
};

/** Everything the detail page for one rental needs. */
export type RenterRentalDetailData = {
  id: string;
  token: string;
  unitLabel: string;
  address: string | null;
  scheduleLabel: string;
  outstanding: number;
  dueNow: {
    remaining: number;
    dueDate: string;
    paid: number;
    due: number;
  } | null;
  months: ForecastMonth[];
  unpaidForProof: { id: string; due_date: string; amount_php: number }[];
  methods: PaymentMethod[];
  paymentInstructions: string | null;
  contract: { view: string | null; download: string | null } | null;
  hasRenterId: boolean;
};

const CONTRACT_BUCKET = "contracts";

type AgreementLite = {
  id: string;
  renter_name: string;
  frequency: AgreementFrequency;
  due_day: number;
  payment_instructions: string | null;
  accepted_payment_methods: unknown;
  renter_access_token: string;
  asset_id: string;
  contract_file_path: string | null;
  renter_id_file_path: string | null;
};

function manilaToday(): string {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The renter's list of rentals (one row per apartment), with a per-rental
 * balance + status. Mirrors the lessor's "Your Properties" list.
 */
export async function loadRenterRentals(
  supabase: SupabaseClient,
  userId: string,
): Promise<RenterRentalsData> {
  const { data: agData } = await supabase
    .from("agreements")
    .select("id, frequency, due_day, asset_id")
    .eq("renter_user_id", userId)
    .order("created_at", { ascending: false });

  const agreements = (agData ?? []) as {
    id: string;
    frequency: string;
    due_day: number;
    asset_id: string;
  }[];
  if (agreements.length === 0) {
    return { rentals: [], totalOutstanding: 0, activeCount: 0 };
  }

  const ids = agreements.map((a) => a.id);
  const assetIds = [...new Set(agreements.map((a) => a.asset_id))];
  const admin = createAdminClient();

  const [{ data: assetRows }, { data: perData }, { data: payData }] =
    await Promise.all([
      admin.from("assets").select("id, label, address_text").in("id", assetIds),
      admin.from("periods").select("*").in("agreement_id", ids),
      admin
        .from("payments")
        .select("agreement_id, period_id, amount_php")
        .in("agreement_id", ids),
    ]);

  const assetById = new Map(
    ((assetRows ?? []) as { id: string; label: string; address_text: string | null }[]).map(
      (a) => [a.id, a],
    ),
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

  const today = manilaToday();
  let totalOutstanding = 0;
  const rentals: RenterRentalRow[] = agreements.map((a) => {
    const view = buildRenterView({
      periods: periodsByAg.get(a.id) ?? [],
      payments: payByAg.get(a.id) ?? [],
      sms: [],
      today,
    });
    const asset = assetById.get(a.asset_id);
    const overdueCount = view.months.filter((m) => m.status === "overdue").length;
    const monthly =
      view.months.find((m) => m.due > 0)?.due ?? view.months[0]?.due ?? 0;
    totalOutstanding += view.outstanding;
    return {
      id: a.id,
      unitLabel: asset?.label ?? "Your rental",
      address: asset?.address_text ?? null,
      monthly,
      outstanding: view.outstanding,
      overdueCount,
      allPaid: view.outstanding === 0,
    };
  });

  return { rentals, totalOutstanding, activeCount: rentals.length };
}

/**
 * Full detail for one of the renter's rentals. Ownership is enforced by the
 * RLS-scoped `supabase` client (renter_user_id = the signed-in user).
 */
export async function loadRenterRentalDetail(
  supabase: SupabaseClient,
  userId: string,
  agreementId: string,
): Promise<RenterRentalDetailData | null> {
  const { data: agRow } = await supabase
    .from("agreements")
    .select(
      "id, renter_name, frequency, due_day, payment_instructions, accepted_payment_methods, renter_access_token, asset_id, contract_file_path, renter_id_file_path",
    )
    .eq("renter_user_id", userId)
    .eq("id", agreementId)
    .maybeSingle();

  const a = agRow as unknown as AgreementLite | null;
  if (!a) return null;

  const admin = createAdminClient();
  const [{ data: assetRow }, { data: perData }, { data: payData }, { data: smsData }] =
    await Promise.all([
      admin
        .from("assets")
        .select("id, label, address_text")
        .eq("id", a.asset_id)
        .maybeSingle(),
      admin.from("periods").select("*").eq("agreement_id", a.id),
      admin
        .from("payments")
        .select("agreement_id, period_id, amount_php")
        .eq("agreement_id", a.id),
      admin
        .from("notifications")
        .select("agreement_id, period_id, sent_at, template_key, body")
        .eq("agreement_id", a.id)
        .eq("channel", "sms")
        .eq("status", "sent")
        .order("sent_at", { ascending: false }),
    ]);

  const asset = assetRow as { label: string; address_text: string | null } | null;
  const today = manilaToday();
  const view = buildRenterView({
    periods: (perData ?? []) as PeriodRow[],
    payments: (payData ?? []) as { period_id: string | null; amount_php: number }[],
    sms: (smsData ?? []) as {
      period_id: string | null;
      sent_at: string | null;
      template_key: string | null;
      body: string | null;
    }[],
    today,
  });

  let contract: { view: string | null; download: string | null } | null = null;
  if (a.contract_file_path) {
    const [{ data: cv }, { data: cd }] = await Promise.all([
      admin.storage.from(CONTRACT_BUCKET).createSignedUrl(a.contract_file_path, 60 * 60),
      admin.storage
        .from(CONTRACT_BUCKET)
        .createSignedUrl(a.contract_file_path, 60 * 60, { download: true }),
    ]);
    contract = { view: cv?.signedUrl ?? null, download: cd?.signedUrl ?? null };
  }

  return {
    id: a.id,
    token: a.renter_access_token,
    unitLabel: asset?.label ?? "Your rental",
    address: asset?.address_text ?? null,
    scheduleLabel: describeSchedule(a.frequency, a.due_day),
    outstanding: view.outstanding,
    dueNow: view.dueNow,
    months: view.months,
    unpaidForProof: view.unpaidForProof,
    methods: (a.accepted_payment_methods as PaymentMethod[]) ?? [],
    paymentInstructions: a.payment_instructions,
    contract,
    hasRenterId: Boolean(a.renter_id_file_path),
  };
}
