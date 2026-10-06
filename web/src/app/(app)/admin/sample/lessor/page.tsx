import { requireAdmin } from "@/lib/auth";
import { LessorDashboardView } from "@/components/lessor-dashboard-view";
import { PreviewBanner } from "@/components/preview-banner";
import { SAMPLE_LESSOR } from "@/lib/preview-samples";

export const dynamic = "force-dynamic";

export default async function SampleLessorPage() {
  await requireAdmin();
  return (
    <div>
      <PreviewBanner
        title="Sample lessor dashboard"
        subtitle="Example data — this is exactly what a landlord sees."
      />
      <LessorDashboardView
        data={SAMPLE_LESSOR}
        preview
        greetingName="Marco"
        previewHref="/admin/sample/unit"
      />
    </div>
  );
}
