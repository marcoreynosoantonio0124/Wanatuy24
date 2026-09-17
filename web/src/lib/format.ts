import type {
  AgreementFrequency,
  PaymentMethod,
  PeriodStatus,
} from "@/lib/database.types";

/** Format integer centavos as Philippine pesos, e.g. 150000 -> "₱1,500.00". */
export function formatPeso(centavos: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavos / 100);
}

/** Parse a peso string (e.g. "1500" or "1,500.50") into integer centavos. */
export function pesosToCentavos(input: string | number): number {
  const n =
    typeof input === "number"
      ? input
      : Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const FREQUENCY_LABELS: Record<AgreementFrequency, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  quarterly: "Quarterly",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  "gcash",
  "maya",
  "bank_transfer",
  "cash",
  "other",
];

export const PERIOD_STATUS_META: Record<
  PeriodStatus,
  { label: string; className: string }
> = {
  upcoming: { label: "Upcoming", className: "bg-slate-100 text-slate-700" },
  due: { label: "Due", className: "bg-amber-100 text-amber-800" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  proof_submitted: {
    label: "Proof submitted",
    className: "bg-blue-100 text-blue-700",
  },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  waived: { label: "Waived", className: "bg-slate-100 text-slate-500" },
};

/** DOW helper for weekly/biweekly due_day (0 = Sunday). */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function describeSchedule(
  frequency: AgreementFrequency,
  dueDay: number,
): string {
  if (frequency === "weekly" || frequency === "biweekly") {
    return `${FREQUENCY_LABELS[frequency]}, every ${WEEKDAYS[dueDay] ?? "?"}`;
  }
  const ord = ordinal(dueDay);
  return `${FREQUENCY_LABELS[frequency]}, on the ${ord}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
