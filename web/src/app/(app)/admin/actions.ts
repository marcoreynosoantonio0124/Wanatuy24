"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { RETURN_COOKIE, makeReturnToken } from "@/lib/impersonation";

/**
 * Admin "Act as this user": signs the admin into a real user's account via a
 * one-time magic-link token (so everything runs with that user's real
 * permissions — a true end-to-end run-through). A signed cookie remembers the
 * admin so they can step back out with one tap.
 */
export async function actAsUser(formData: FormData): Promise<void> {
  const { user: adminUser, admin } = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  if (!targetId) redirect("/admin");

  const { data: targetRow } = await admin
    .from("users")
    .select("id, email, role")
    .eq("id", targetId)
    .maybeSingle();
  const target = targetRow as
    | { id: string; email: string | null; role: string | null }
    | null;
  if (!target?.email) redirect("/admin");

  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (!tokenHash) redirect("/admin");

  // Where that user lands after the login.
  const dest =
    target.role === "tenant"
      ? "/my-rentals"
      : target.role === "lessor"
        ? "/dashboard"
        : "/welcome";

  // Remember who to come back as (signed, http-only — can't be forged).
  const cookieStore = await cookies();
  cookieStore.set(RETURN_COOKIE, makeReturnToken(adminUser.id), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6, // 6 hours
  });

  redirect(
    `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(dest)}`,
  );
}

/**
 * Makes sure a ready-to-use test account exists (auto-confirmed, profile
 * already filled in so it skips onboarding). Reuses the account if it's already
 * there, so tapping the button twice is harmless.
 */
async function ensureTestUser(
  admin: SupabaseClient,
  email: string,
  role: "lessor" | "tenant",
  fullName: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let id = (existing as { id: string } | null)?.id;
  if (!id) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error || !created?.user) return;
    id = created.user.id;
  }

  // The signup trigger creates the users row; fill in role + a complete profile
  // so "Act as" drops straight into their dashboard.
  await admin.from("users").upsert(
    {
      id,
      email,
      role,
      full_name: fullName,
      address: "123 Test St, Lipa City, Batangas",
      birthdate: "1990-01-01",
      marital_status: "Single",
      profile_completed: true,
      is_admin: false,
    },
    { onConflict: "id" },
  );
}

/**
 * Spins up a test landlord and a test renter the admin can immediately "Act as"
 * for a full run-through, without needing spare email addresses.
 */
export async function createTestAccounts(): Promise<void> {
  const { admin } = await requireAdmin();
  await ensureTestUser(admin, "test-landlord@example.com", "lessor", "Test Landlord");
  await ensureTestUser(admin, "test-renter@example.com", "tenant", "Test Renter");
  revalidatePath("/admin");
}
