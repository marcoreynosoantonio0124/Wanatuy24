import { requireAdmin } from "@/lib/auth";
import { RenterRentalDetail } from "@/components/renter-rental-detail";
import { PreviewBanner } from "@/components/preview-banner";
import { SAMPLE_TENANT_DETAIL } from "@/lib/preview-samples";

export const dynamic = "force-dynamic";

export default async function SampleTenantUnitPage() {
  await requireAdmin();
  return (
    <div>
      <PreviewBanner
        title="Sample rental record"
        subtitle="Example data — this is exactly what a renter sees for one rental."
      />
      <RenterRentalDetail
        data={SAMPLE_TENANT_DETAIL}
        backHref="/admin/sample/tenant"
        preview
      />
    </div>
  );
}
