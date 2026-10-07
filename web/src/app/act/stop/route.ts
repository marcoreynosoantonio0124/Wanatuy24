import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { RETURN_COOKIE, readReturnToken } from "@/lib/impersonation";

/**
 * Steps an admin back out of "Act as this user". Reads the signed return
 * cookie, confirms it, and logs the browser back in as the admin via a
 * one-time magic-link token — then clears the cookie.
 */
export async function GET(request: NextRequest) {
  const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
  const token = request.cookies.get(RETURN_COOKIE)?.value;
  const adminId = readReturnToken(token);

  // Always clear the cookie; if the token is bad, just go to the login page.
  if (!adminId) {
    const res = NextResponse.redirect(`${origin}/login`);
    res.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const admin = createAdminClient();
  const { data: adminRow } = await admin
    .from("users")
    .select("email, is_admin")
    .eq("id", adminId)
    .maybeSingle();
  const row = adminRow as { email: string | null; is_admin: boolean } | null;

  if (!row?.email || !row.is_admin) {
    const res = NextResponse.redirect(`${origin}/login`);
    res.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: row.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (!tokenHash) {
    const res = NextResponse.redirect(`${origin}/login`);
    res.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const url = new URL(`${origin}/auth/confirm`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", "/admin");
  const res = NextResponse.redirect(url);
  res.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
