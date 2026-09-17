"use client";

import { useActionState } from "react";
import {
  sendReminderNow,
  type ReminderResult,
} from "@/app/(app)/agreements/[id]/actions";

/** One tap to send the reminder — no share sheet, no picking an app. */
export function SendReminderNowButton({
  periodId,
  agreementId,
}: {
  periodId: string;
  agreementId: string;
}) {
  const [state, action, pending] = useActionState<ReminderResult, FormData>(
    sendReminderNow,
    {},
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="period_id" value={periodId} />
      <input type="hidden" name="agreement_id" value={agreementId} />
      <button
        type="submit"
        disabled={pending || state.ok}
        className="rounded-md border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-70"
      >
        {pending
          ? "Sending…"
          : state.ok
            ? `Sent via ${state.channels?.join(", ")} ✓`
            : "📤 Send reminder"}
      </button>
      {state.error && (
        <span className="max-w-[220px] text-right text-[11px] text-red-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
