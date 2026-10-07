import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { loadLessorDashboard } from "@/lib/lessor-dashboard";
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
    .select("email")
    .eq("id", lessorId)
    .maybeSingle();
  const email = (u as { email?: string } | null)?.email;
  if (!email) notFound();

  const data = await loadLessorDashboard(admin, { lessorId });

  const first = email.split("@")[0].split(/[._+]/)[0];
  const greetingName = first.charAt(0).toUpperCase() + first.slice(1);

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
