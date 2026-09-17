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

const PROOF_BUCKET = "payment-proofs";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

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

  // Optional receipt upload to private Storage.
  let filePath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: "That file is larger than 10 MB." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: "Upload a PNG, JPG, WebP, or PDF." };
    }
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${agreement.id}/${v.period_id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(PROOF_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };
    filePath = path;
  }

  const { error } = await admin.from("payment_proofs").insert({
    period_id: v.period_id,
    submitted_by: "renter",
    method: v.method,
    reference_no: v.reference_no || null,
    amount_php: pesosToCentavos(v.amount),
    paid_on: v.paid_on,
    file_path: filePath,
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
