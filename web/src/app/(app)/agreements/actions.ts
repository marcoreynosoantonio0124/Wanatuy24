"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { pesosToCentavos } from "@/lib/format";
import { ALL_PAYMENT_METHODS } from "@/lib/format";

const CONTRACT_BUCKET = "contracts";
const ID_BUCKET = "ids";
const CONTRACT_MAX_BYTES = 20 * 1024 * 1024;
const CONTRACT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

/** True when the value is a usable uploaded file of an allowed type/size. */
function isValidUpload(file: FormDataEntryValue | null): file is File {
  return (
    file instanceof File &&
    file.size > 0 &&
    file.size <= CONTRACT_MAX_BYTES &&
    CONTRACT_TYPES.includes(file.type)
  );
}

const schema = z
  .object({
    asset_id: z.string().uuid("Choose a unit."),
    renter_name: z.string().trim().min(1, "Renter name is required.").max(120),
    renter_email: z.string().trim().email().optional().or(z.literal("")),
    renter_phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +639171234567.")
      .optional()
      .or(z.literal("")),
    lessor_phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +639171234567.")
      .optional()
      .or(z.literal("")),
    amount: z.string().min(1, "Enter the rent amount."),
    frequency: z.enum(["monthly", "weekly", "biweekly", "quarterly"]),
    due_day: z.coerce.number().int().min(0).max(31),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().optional().or(z.literal("")),
    grace_days: z.coerce.number().int().min(0).max(60).default(0),
    payment_methods: z.array(z.enum(ALL_PAYMENT_METHODS)).min(1, "Pick at least one payment method."),
    payment_instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      (["monthly", "quarterly"].includes(v.frequency) &&
        v.due_day >= 1 &&
        v.due_day <= 31) ||
      (["weekly", "biweekly"].includes(v.frequency) &&
        v.due_day >= 0 &&
        v.due_day <= 6),
    { message: "Due day doesn't match the frequency.", path: ["due_day"] },
  );

export type AgreementFormState = { error?: string };

/** A short, human-friendly transaction number, e.g. "DM-7KQ3PX2M". */
function makeTransactionNo(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `DM-${s}`;
}

export async function createAgreement(
  _prev: AgreementFormState,
  formData: FormData,
): Promise<AgreementFormState> {
  const { user, supabase } = await requireUser();

  const parsed = schema.safeParse({
    asset_id: formData.get("asset_id"),
    renter_name: formData.get("renter_name"),
    renter_email: formData.get("renter_email") ?? "",
    renter_phone: formData.get("renter_phone") ?? "",
    lessor_phone: formData.get("lessor_phone") ?? "",
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    due_day: formData.get("due_day"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") ?? "",
    grace_days: formData.get("grace_days") ?? 0,
    payment_methods: formData.getAll("payment_methods"),
    payment_instructions: formData.get("payment_instructions") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const v = parsed.data;
  const { data: inserted, error } = await supabase
    .from("agreements")
    .insert({
      asset_id: v.asset_id,
      lessor_id: user.id,
      renter_name: v.renter_name,
      renter_email: v.renter_email || null,
      renter_phone: v.renter_phone || null,
      lessor_phone: v.lessor_phone || null,
      amount_php: pesosToCentavos(v.amount),
      frequency: v.frequency,
      due_day: v.due_day,
      start_date: v.start_date,
      end_date: v.end_date || null,
      grace_days: v.grace_days,
      accepted_payment_methods: v.payment_methods,
      payment_instructions: v.payment_instructions || null,
      status: "active",
      transaction_no: makeTransactionNo(),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Could not create the agreement." };
  }

  // Seed upcoming periods for the next 18 months (self-limits to end_date).
  const until = new Date();
  until.setMonth(until.getMonth() + 18);
  const { error: rpcError } = await supabase.rpc("generate_periods", {
    p_agreement_id: inserted.id,
    p_until: until.toISOString().slice(0, 10),
  });
  if (rpcError) {
    return { error: `Agreement saved, but scheduling failed: ${rpcError.message}` };
  }

  const admin = createAdminClient();

  // If a signed contract was uploaded, keep it in the vault too.
  const file = formData.get("contract");
  if (isValidUpload(file)) {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${inserted.id}/contract-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(CONTRACT_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (!upErr) {
      await admin
        .from("agreements")
        .update({ contract_file_path: path })
        .eq("id", inserted.id);
    }
  }

  // If the lessor uploaded a photo of their ID, keep it privately on their
  // profile.
  const idFile = formData.get("lessor_id");
  if (isValidUpload(idFile)) {
    const ext = idFile.name.includes(".") ? idFile.name.split(".").pop() : "bin";
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await idFile.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(ID_BUCKET)
      .upload(path, bytes, { contentType: idFile.type, upsert: false });
    if (!upErr) {
      await admin
        .from("users")
        .update({ id_file_path: path })
        .eq("id", user.id);
    }
  }

  // If the lessor also uploaded the renter's ID, keep it on the agreement so
  // both parties can see it inside the unit (transparency).
  const renterIdFile = formData.get("renter_id");
  if (isValidUpload(renterIdFile)) {
    const ext = renterIdFile.name.includes(".")
      ? renterIdFile.name.split(".").pop()
      : "bin";
    const path = `${inserted.id}/renter-id-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await renterIdFile.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(ID_BUCKET)
      .upload(path, bytes, { contentType: renterIdFile.type, upsert: false });
    if (!upErr) {
      await admin
        .from("agreements")
        .update({ renter_id_file_path: path })
        .eq("id", inserted.id);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/agreements/${inserted.id}`);
}

const editSchema = z.object({
  id: z.string().uuid(),
  renter_name: z.string().trim().min(1, "Renter name is required.").max(120),
  renter_email: z.string().trim().email().optional().or(z.literal("")),
  renter_phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +639171234567.")
    .optional()
    .or(z.literal("")),
  lessor_phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +639171234567.")
    .optional()
    .or(z.literal("")),
  payment_methods: z
    .array(z.enum(ALL_PAYMENT_METHODS))
    .min(1, "Pick at least one payment method."),
  payment_instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["active", "ended", "cancelled", "draft"]),
});

export type EditAgreementState = { error?: string };

/** Updates an agreement's contact info, payment settings, and status. */
export async function updateAgreement(
  _prev: EditAgreementState,
  formData: FormData,
): Promise<EditAgreementState> {
  const { user, supabase } = await requireUser();

  const parsed = editSchema.safeParse({
    id: formData.get("id"),
    renter_name: formData.get("renter_name"),
    renter_email: formData.get("renter_email") ?? "",
    renter_phone: formData.get("renter_phone") ?? "",
    lessor_phone: formData.get("lessor_phone") ?? "",
    payment_methods: formData.getAll("payment_methods"),
    payment_instructions: formData.get("payment_instructions") ?? "",
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const v = parsed.data;

  // Ownership check via RLS-scoped client.
  const { data: existing } = await supabase
    .from("agreements")
    .select("id, lessor_id")
    .eq("id", v.id)
    .single();
  if (!existing || (existing as { lessor_id: string }).lessor_id !== user.id) {
    return { error: "Agreement not found." };
  }

  const { error } = await supabase
    .from("agreements")
    .update({
      renter_name: v.renter_name,
      renter_email: v.renter_email || null,
      renter_phone: v.renter_phone || null,
      lessor_phone: v.lessor_phone || null,
      accepted_payment_methods: v.payment_methods,
      payment_instructions: v.payment_instructions || null,
      status: v.status,
    })
    .eq("id", v.id);
  if (error) return { error: error.message };

  revalidatePath(`/agreements/${v.id}`);
  revalidatePath("/dashboard");
  redirect(`/agreements/${v.id}`);
}
