"use client";

import { useActionState, useState } from "react";
import { sendRenterMessage, type MessageState } from "@/app/r/[token]/actions";
import type { MonthMessage } from "@/lib/renter-rentals";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

/**
 * A per-month "Message the owner" button on the renter's rental detail. Shows
 * the existing thread for that month and lets the renter send a new message
 * (e.g. "I might be late this month") straight to the lessor's inbox.
 */
export function MonthMessageButton({
  token,
  periodId,
  existing,
  demo = false,
}: {
  token: string;
  periodId: string;
  existing: MonthMessage[];
  /** Sample preview: show the UI but don't actually submit. */
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<MessageState, FormData>(
    sendRenterMessage,
    {},
  );

  return (
    <div className="mt-3">
      {existing.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {existing.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                m.sender === "renter"
                  ? "ml-auto bg-emerald-500/15 text-emerald-100"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {m.sender === "renter" ? "You" : "Owner"} · {fmt(m.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {state.ok ? (
        <p className="text-sm font-semibold text-pink-300">
          ❤️ Message sent to your owner.
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-pink-400/40 bg-pink-500/10 px-3 py-2.5 text-sm font-semibold text-pink-200 transition hover:bg-pink-500/20 active:scale-95"
        >
          ❤️✉️ Message the owner
        </button>
      ) : (
        <form action={action} className="space-y-2">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="period_id" value={periodId} />
          {demo && (
            <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
              👀 Sample preview — on a real renter account this sends to your
              owner.
            </p>
          )}
          <textarea
            name="body"
            required
            rows={3}
            maxLength={1000}
            placeholder="e.g. Hi po, baka ma-late ako nang kaunti this month — ok lang po ba?"
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
              {demo ? "Sample preview" : pending ? "Sending…" : "Send message"}
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
      )}
    </div>
  );
}
