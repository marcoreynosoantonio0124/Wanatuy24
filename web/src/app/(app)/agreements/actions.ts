"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { pesosToCentavos } from "@/lib/format";
import { ALL_PAYMENT_METHODS } from "@/lib/format";

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
      amount_php: pesosToCentavos(v.amount),
      frequency: v.frequency,
      due_day: v.due_day,
      start_date: v.start_date,
      end_date: v.end_date || null,
      grace_days: v.grace_days,
      accepted_payment_methods: v.payment_methods,
      payment_instructions: v.payment_instructions || null,
      status: "active",
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

  revalidatePath("/dashboard");
  redirect(`/agreements/${inserted.id}`);
}
