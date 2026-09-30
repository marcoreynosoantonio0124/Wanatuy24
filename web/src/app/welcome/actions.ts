"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Saves the role the user picked on the welcome screen and sends them to the
 * matching home. Uses the admin client so the write isn't blocked by RLS
 * (same pattern as profile creation in the auth callback).
 */
export async function chooseRole(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const role = String(formData.get("role"));
  if (role !== "lessor" && role !== "tenant") return;

  const admin = createAdminClient();
  await admin.from("users").update({ role }).eq("id", user.id);

  redirect(role === "tenant" ? "/my-rentals" : "/dashboard");
}
