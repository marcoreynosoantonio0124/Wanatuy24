import type { PeriodStatus } from "@/lib/database.types";
import { PERIOD_STATUS_META } from "@/lib/format";

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  const meta = PERIOD_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
