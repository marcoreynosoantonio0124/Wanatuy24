"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type JoinUnitState = { error?: string; ok?: string };

/**
 * A renter joins a unit by typing the transaction number their landlord gave
 * them (e.g. "DM-7KQ3PX2M"). We find that agreement and link it to the signed-in
 * renter, so the unit auto-populates on their dashboard. Only unclaimed units
 * (no renter linked yet) can be joined this way.
 */
export async function joinByTransactionNo(
  _prev: JoinUnitState,
  formData: FormData,
): Promise<JoinUnitState> {
  const { user } = await requireUser();

  let code = String(formData.get("transaction_no") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!code) return { error: "Enter the transaction number from your landlord." };
  if (!code.startsWith("DM-") && /^[A-Z0-9]+$/.test(code)) code = `DM-${code}`;

  const admin = createAdminClient();
  const { data: agRow } = await admin
    .from("agreements")
    .select("id, renter_user_id, renter_email")
    .eq("transaction_no", code)
    .maybeSingle();

  const ag = agRow as
    | { id: string; renter_user_id: string | null; renter_email: string | null }
    | null;
  if (!ag) {
    return {
      error:
        "No unit found with that number. Double-check it with your landlord (e.g. DM-7KQ3PX2M).",
    };
  }
  if (ag.renter_user_id && ag.renter_user_id !== user.id) {
    return { error: "That unit is already linked to another renter." };
  }
  if (ag.renter_user_id === user.id) {
    redirect(`/my-rentals/${ag.id}`);
  }

  const { error } = await admin
    .from("agreements")
    .update({
      renter_user_id: user.id,
      renter_email: ag.renter_email ?? user.email ?? null,
    })
    .eq("id", ag.id)
    .is("renter_user_id", null);
  if (error) return { error: "Could not join that unit. Please try again." };

  revalidatePath("/my-rentals");
  redirect(`/my-rentals/${ag.id}`);
}
