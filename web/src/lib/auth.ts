import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Returns the signed-in auth user or redirects to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
}

/**
 * Like requireUser, but only for the founder/admin. Non-admins are bounced to
 * their own dashboard. Also hands back a service-role `admin` client for the
 * platform-wide reads admin pages need (monitoring any lessor or renter).
 */
export async function requireAdmin() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(data as { is_admin?: boolean } | null)?.is_admin) {
    redirect("/dashboard");
  }
  return { user, supabase, admin: createAdminClient() };
}
