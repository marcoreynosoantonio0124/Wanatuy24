import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Verifies an email link (password reset, signup confirmation, magic link,
 * email change) using the one-time token hash carried IN the link.
 *
 * Unlike the PKCE `code` flow in /auth/callback, this does not need the
 * code-verifier cookie from the browser that *requested* the email. That cookie
 * is missing whenever the link is opened somewhere else — e.g. the Gmail app's
 * in-app browser on an iPad — which made reset links bounce users back to
 * sign-in. verifyOtp() establishes the session in whichever browser opens the
 * link, so email links now work everywhere.
 *
 * Email templates point here as:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: reqOrigin } = new URL(request.url);
  const origin = process.env.APP_BASE_URL || reqOrigin;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : `/${nextParam}`;

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Same profile bootstrap + renter linking as /auth/callback, so signup
  // confirmations that arrive here are wired up too.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    await admin
      .from("users")
      .upsert(
        { id: user.id, email: user.email ?? "" },
        { onConflict: "id", ignoreDuplicates: true },
      );
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
