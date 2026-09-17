import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the magic-link redirect: exchanges the PKCE code for a session,
 * ensures a public.users row exists, then forwards to the app.
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

  // Mirror the auth user into public.users (id == auth.uid()).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("users").upsert(
      { id: user.id, email: user.email ?? "" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
