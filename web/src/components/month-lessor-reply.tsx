"use client";

import { useActionState, useState } from "react";
import {
  sendLessorMessage,
  type ReplyState,
} from "@/app/(app)/agreements/[id]/actions";

/**
 * A per-month "Reply" composer on the lessor's unit view, so the landlord can
 * answer the renter's message (or start a note) for that specific month.
 */
export function MonthLessorReply({
  agreementId,
  periodId,
  hasThread,
  demo = false,
}: {
  agreementId: string;
  periodId: string;
  hasThread: boolean;
  /** Sample preview: show the UI but don't actually submit. */
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReplyState, FormData>(
    sendLessorMessage,
    {},
  );

  if (state.ok) {
    return (
      <p className="mt-2 text-sm font-semibold text-emerald-300">
        ✓ Reply sent to your renter.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-pink-400/40 bg-pink-500/10 px-3 py-2.5 text-sm font-semibold text-pink-200 transition hover:bg-pink-500/20 active:scale-95"
      >
        💬 {hasThread ? "Reply to renter" : "Message renter"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="agreement_id" value={agreementId} />
      <input type="hidden" name="period_id" value={periodId} />
      {demo && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          👀 Sample preview — on your real unit this sends to the renter.
        </p>
      )}
      <textarea
        name="body"
        required
        rows={2}
        maxLength={1000}
        placeholder="Reply to your renter…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || demo}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700 active:scale-95 disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {demo ? "Sample preview" : pending ? "Sending…" : "Send reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
