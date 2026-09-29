"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

/**
 * Sets a new password for the currently-authenticated user. The user reaches
 * this page via the reset link, which /auth/callback exchanges for a session
 * first, so updateUser() runs as them.
 */
export async function updatePassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!z.string().min(8).safeParse(password).success) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }
  redirect("/dashboard");
}
