import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { loadLessorDashboard } from "@/lib/lessor-dashboard";
import { firstName } from "@/lib/format";
import { LessorDashboardView } from "@/components/lessor-dashboard-view";
import { PreviewBanner } from "@/components/preview-banner";

export const dynamic = "force-dynamic";

export default async function ViewAsLessorPage({
  params,
}: PageProps<"/admin/as/lessor/[lessorId]">) {
  const { admin } = await requireAdmin();
  const { lessorId } = await params;

  const { data: u } = await admin
    .from("users")
    .select("email, full_name")
    .eq("id", lessorId)
    .maybeSingle();
  const urow = u as { email?: string; full_name?: string | null } | null;
  const email = urow?.email;
  if (!email) notFound();

  const data = await loadLessorDashboard(admin, { lessorId });

  const greetingName = firstName(urow?.full_name, email);

  return (
    <div>
      <PreviewBanner title="Viewing a lessor's live dashboard" subtitle={email} />
      <LessorDashboardView
        data={data}
        preview
        greetingName={greetingName}
        pageBackground="/lessor-hero.jpg"
      />
    </div>
  );
}
