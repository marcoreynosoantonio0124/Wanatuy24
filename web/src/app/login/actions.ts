"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  next: z.string().optional(),
});

export type LoginState = { error?: string; sent?: boolean; email?: string };

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, next } = parsed.data;
  const supabase = await createClient();
  // Prefer the configured public URL (correct behind proxies like Replit),
  // fall back to the request origin.
  const origin = process.env.APP_BASE_URL || (await headers()).get("origin") || "";
  const callback = new URL("/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) return { error: error.message, email };
  return { sent: true, email };
}
