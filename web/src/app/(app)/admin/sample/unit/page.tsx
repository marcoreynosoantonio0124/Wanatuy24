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
        demo
        proofByPeriod={{
          "s-9": {
            amountCentavos: 600_000,
            method: "gcash",
            paidOn: "2026-10-03",
            viewUrl: null,
          },
        }}
        messagesByPeriod={{
          "s-8": [
            {
              sender: "renter",
              body: "Hi po, baka ma-late ako ng konti this month. Sorry po, aayusin ko agad.",
              createdAt: "2026-09-10T09:00:00+08:00",
            },
          ],
        }}
      />
    </div>
  );
}
