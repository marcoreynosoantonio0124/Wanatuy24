"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export type LoginMode = "signin" | "signup" | "reset";

export type LoginState = {
  error?: string;
  info?: string;
  email?: string;
  mode?: LoginMode;
};

async function siteOrigin(): Promise<string> {
  // Prefer the configured public URL (correct behind proxies), else the request origin.
  return process.env.APP_BASE_URL || (await headers()).get("origin") || "";
}

/** Email + password sign-in. On success, redirects into the app. */
export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      mode: "signin",
      email: String(formData.get("email") ?? ""),
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      mode: "signin",
      email,
      error: "Mali ang email o password. / Incorrect email or password.",
    };
  }
  redirect(next || "/dashboard");
}

/** Create an account. Supabase sends a one-time confirm email (our welcome email). */
export async function signUp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      mode: "signup",
      email: String(formData.get("email") ?? ""),
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Must accept the Terms & Privacy Policy to create an account.
  const consent = formData.get("consent");
  if (consent !== "on") {
    return {
      mode: "signup",
      email: String(formData.get("email") ?? ""),
      error: "Please agree to the Terms of Service and Privacy Policy to continue.",
    };
  }

  const { email, password, next } = parsed.data;
  const origin = await siteOrigin();
  const callback = new URL("/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) {
    return { mode: "signup", email, error: error.message };
  }

  // Supabase returns a user with an empty identities array when the email is
  // already registered (it hides this to prevent account enumeration).
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      mode: "signin",
      email,
      info: "May account na sa email na ito. Sign in below — o gamitin ang “Forgot password?”.",
    };
  }

  // Email confirmation disabled → session exists → straight into the app.
  if (data.session) {
    redirect(next || "/dashboard");
  }

  return {
    mode: "signin",
    email,
    info: `Almost there! We emailed a confirmation link to ${email}. Tap it to activate your account, then sign in here.`,
  };
}

/** Send a password-reset link. Always reports success (no email enumeration). */
export async function requestReset(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  if (!z.string().email().safeParse(email).success) {
    return { mode: "reset", email, error: "Enter a valid email address." };
  }

  const origin = await siteOrigin();
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", "/reset-password");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  });

  return {
    mode: "reset",
    email,
    info: "If that email has an account, we sent a reset link. Check your inbox.",
  };
}
