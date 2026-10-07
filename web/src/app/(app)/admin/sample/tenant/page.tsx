import { requireAdmin } from "@/lib/auth";
import { RenterRentalsList } from "@/components/renter-rentals-list";
import { PreviewBanner } from "@/components/preview-banner";
import { PageWallpaper } from "@/components/page-wallpaper";
import { SAMPLE_TENANT_RENTALS } from "@/lib/preview-samples";

export const dynamic = "force-dynamic";

export default async function SampleTenantPage() {
  await requireAdmin();
  return (
    <div>
      <PageWallpaper src="/renter-hero.jpg" />
      <PreviewBanner
        title="Sample renter dashboard"
        subtitle="Example data — this is exactly what a renter sees."
      />
      <RenterRentalsList
        data={SAMPLE_TENANT_RENTALS}
        greetingName="Juan"
        preview
        previewHref="/admin/sample/tenant/unit"
      />
    </div>
  );
}
