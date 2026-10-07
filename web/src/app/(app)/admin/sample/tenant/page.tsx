import { requireAdmin } from "@/lib/auth";
import { RenterDashboard } from "@/components/renter-dashboard";
import { PreviewBanner } from "@/components/preview-banner";
import { PageWallpaper } from "@/components/page-wallpaper";
import { SAMPLE_TENANT } from "@/lib/preview-samples";

export const dynamic = "force-dynamic";

export default async function SampleTenantPage() {
  await requireAdmin();
  return (
    <div>
      <PageWallpaper />
      <PreviewBanner
        title="Sample renter dashboard"
        subtitle="Example data — this is exactly what a renter sees."
      />
      <RenterDashboard {...SAMPLE_TENANT} />
    </div>
  );
}
