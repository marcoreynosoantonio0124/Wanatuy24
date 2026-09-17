import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Handles the magic-link redirect: exchanges the PKCE code for a session,
 * ensures a public.users row exists, links the user to any rentals addressed
 * to their email, then forwards to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: reqOrigin } = new URL(request.url);
  const origin = process.env.APP_BASE_URL || reqOrigin;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Service role bypasses RLS for profile creation + renter linking.
    const admin = createAdminClient();
    // Ensure a public.users row (also created by the signup trigger).
    await admin
      .from("users")
      .upsert(
        { id: user.id, email: user.email ?? "" },
        { onConflict: "id", ignoreDuplicates: true },
      );
    // Link this account to any agreement addressed to their email.
    if (user.email) {
      await admin
        .from("agreements")
        .update({ renter_user_id: user.id })
        .eq("renter_email", user.email)
        .is("renter_user_id", null);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
