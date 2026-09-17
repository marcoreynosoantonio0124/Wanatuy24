"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { pesosToCentavos, ALL_PAYMENT_METHODS } from "@/lib/format";

const schema = z.object({
  token: z.string().min(10),
  period_id: z.string().uuid(),
  method: z.enum(ALL_PAYMENT_METHODS),
  amount: z.string().min(1),
  reference_no: z.string().trim().max(120).optional().or(z.literal("")),
  paid_on: z.string().min(1),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProofState = { error?: string; ok?: boolean };

export async function submitProof(
  _prev: ProofState,
  formData: FormData,
): Promise<ProofState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    period_id: formData.get("period_id"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference_no: formData.get("reference_no") ?? "",
    paid_on: formData.get("paid_on"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const v = parsed.data;
  const admin = createAdminClient();

  // Authorize: the period must belong to the agreement holding this token.
  const { data: agreement } = await admin
    .from("agreements")
    .select("id")
    .eq("renter_access_token", v.token)
    .single();
  if (!agreement) return { error: "This link is no longer valid." };

  const { data: period } = await admin
    .from("periods")
    .select("id, agreement_id")
    .eq("id", v.period_id)
    .eq("agreement_id", agreement.id)
    .single();
  if (!period) return { error: "That due date wasn't found." };

  const { error } = await admin.from("payment_proofs").insert({
    period_id: v.period_id,
    submitted_by: "renter",
    method: v.method,
    reference_no: v.reference_no || null,
    amount_php: pesosToCentavos(v.amount),
    paid_on: v.paid_on,
    note: v.note || null,
    status: "pending",
  });
  if (error) return { error: error.message };

  await admin
    .from("periods")
    .update({ status: "proof_submitted" })
    .eq("id", v.period_id)
    .in("status", ["upcoming", "due", "overdue"]);

  revalidatePath(`/r/${v.token}`);
  return { ok: true };
}
