import { requireAdmin } from "@/lib/auth";
import { UnitTimetable } from "@/components/unit-timetable";
import { PreviewBanner } from "@/components/preview-banner";
import { SAMPLE_UNIT } from "@/lib/preview-samples";

export const dynamic = "force-dynamic";

export default async function SampleUnitPage() {
  await requireAdmin();
  return (
    <div>
      <PreviewBanner
        title="Sample unit — full year"
        subtitle="Example data — this is what a landlord sees when they tap a unit."
      />
      <UnitTimetable
        {...SAMPLE_UNIT}
        backHref="/admin/sample/lessor"
        showManage={false}
      />
    </div>
  );
}
