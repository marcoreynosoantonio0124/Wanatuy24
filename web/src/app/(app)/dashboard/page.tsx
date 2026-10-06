import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadLessorDashboard } from "@/lib/lessor-dashboard";
import { LessorDashboardView } from "@/components/lessor-dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  // Founder / admin accounts are monitoring-only — they live in the Command
  // Center, not in a lessor dashboard of their own.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if ((me as { is_admin?: boolean } | null)?.is_admin) redirect("/admin");

  const data = await loadLessorDashboard(supabase);
  return <LessorDashboardView data={data} />;
}
