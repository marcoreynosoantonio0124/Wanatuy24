"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { pesosToCentavos } from "@/lib/format";

function revalidate(agreementId: string) {
  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/dashboard");
}

export async function markPeriodPaid(formData: FormData) {
  const { user, supabase } = await requireUser();
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));

  await supabase
    .from("periods")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", periodId);
  revalidate(agreementId);
}

export async function waivePeriod(formData: FormData) {
  const { supabase } = await requireUser();
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));

  await supabase.from("periods").update({ status: "waived" }).eq("id", periodId);
  revalidate(agreementId);
}

export async function reviewProof(formData: FormData) {
  const { user, supabase } = await requireUser();
  const proofId = String(formData.get("proof_id"));
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));
  const decision = String(formData.get("decision")); // "accepted" | "rejected"

  if (decision !== "accepted" && decision !== "rejected") return;

  await supabase
    .from("payment_proofs")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      rejection_reason:
        decision === "rejected"
          ? String(formData.get("rejection_reason") ?? "") || null
          : null,
    })
    .eq("id", proofId);

  if (decision === "accepted") {
    await supabase
      .from("periods")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", periodId);
  } else {
    // Send it back to due/overdue based on the date.
    await supabase
      .from("periods")
      .update({ status: "due" })
      .eq("id", periodId)
      .eq("status", "proof_submitted");
  }
  revalidate(agreementId);
}

const chargeSchema = z.object({
  agreement_id: z.string().uuid(),
  period_id: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().min(1).max(120),
  amount: z.string().min(1),
});

export async function addCharge(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const parsed = chargeSchema.safeParse({
    agreement_id: formData.get("agreement_id"),
    period_id: formData.get("period_id") ?? "",
    label: formData.get("label"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return;

  const v = parsed.data;
  await supabase.from("charges").insert({
    agreement_id: v.agreement_id,
    period_id: v.period_id || null,
    label: v.label,
    amount_php: pesosToCentavos(v.amount),
    created_by: user.id,
  });
  revalidate(v.agreement_id);
}
