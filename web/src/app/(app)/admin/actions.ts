"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
