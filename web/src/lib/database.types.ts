// Hand-written types mirroring supabase/migrations. Keep in sync with the SQL,
// or regenerate with `supabase gen types typescript`.

export type AssetType =
  | "house" | "room" | "apartment" | "car" | "motorcycle" | "commercial" | "other";
export type AgreementFrequency = "monthly" | "weekly" | "biweekly" | "quarterly";
export type AgreementStatus = "draft" | "active" | "ended" | "cancelled";
export type PeriodStatus =
  | "upcoming" | "due" | "overdue" | "proof_submitted" | "paid" | "waived";
export type PaymentMethod = "gcash" | "maya" | "bank_transfer" | "cash" | "other";
export type ProofSubmitter = "renter" | "lessor";
export type ProofStatus = "pending" | "accepted" | "rejected";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AssetRow {
  id: string;
  lessor_id: string;
  type: AssetType;
  label: string;
  address_text: string | null;
  notes: string | null;
  created_at: string;
}

export interface AgreementRow {
  id: string;
  asset_id: string;
  lessor_id: string;
  renter_name: string;
  renter_email: string | null;
  renter_phone: string | null;
  renter_user_id: string | null;
  amount_php: number;
  frequency: AgreementFrequency;
  due_day: number;
  start_date: string;
  end_date: string | null;
  grace_days: number;
  reminder_schedule: number[];
  reminder_time_local: string;
  accepted_payment_methods: PaymentMethod[];
  payment_instructions: string | null;
  contract_file_path: string | null;
  status: AgreementStatus;
  renter_access_token: string;
  created_at: string;
  updated_at: string;
}

export interface PeriodRow {
  id: string;
  agreement_id: string;
  due_date: string;
  amount_php: number;
  status: PeriodStatus;
  paid_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface ChargeRow {
  id: string;
  agreement_id: string;
  period_id: string | null;
  label: string;
  amount_php: number;
  created_by: string | null;
  created_at: string;
}

export interface PaymentProofRow {
  id: string;
  period_id: string;
  submitted_by: ProofSubmitter;
  method: PaymentMethod;
  reference_no: string | null;
  amount_php: number;
  paid_on: string;
  file_path: string | null;
  note: string | null;
  status: ProofStatus;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string | null;
  agreement_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}
