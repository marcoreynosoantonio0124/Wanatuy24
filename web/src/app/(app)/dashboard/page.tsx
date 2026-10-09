import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadLessorDashboard } from "@/lib/lessor-dashboard";
import { firstName } from "@/lib/format";
import { LessorDashboardView } from "@/components/lessor-dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  // Founder / admin accounts are monitoring-only — they live in the Command
  // Center, not in a lessor dashboard of their own.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();
  const meRow = me as { is_admin?: boolean; full_name?: string | null } | null;
  if (meRow?.is_admin) redirect("/admin");

  const greetingName = firstName(meRow?.full_name, user.email);

  const data = await loadLessorDashboard(supabase);
  return (
    <LessorDashboardView
      data={data}
      greetingName={greetingName}
      pageBackground="/lessor-hero.jpg"
    />
  );
}
