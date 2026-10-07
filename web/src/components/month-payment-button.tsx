"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "@/app/(app)/agreements/[id]/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
      )}
      {pending ? "Saving…" : "Record payment"}
    </button>
  );
}

/**
 * A per-month "Payment received" action on the lessor's unit view. Reveals an
 * amount field prefilled with what's still owed; recording it runs the existing
 * recordPayment action, which recomputes the month's balance automatically.
 */
export function MonthPaymentButton({
  agreementId,
  periodId,
  defaultAmountCentavos,
  demo = false,
}: {
  agreementId: string;
  periodId: string;
  defaultAmountCentavos: number;
  /** Sample preview: show the UI but don't actually submit. */
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const amountDefault =
    defaultAmountCentavos > 0 ? (defaultAmountCentavos / 100).toFixed(2) : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
      >
        ✓ Payment received
      </button>
    );
  }

  return (
    <form
      action={recordPayment}
      className="mt-3 space-y-3 rounded-xl border border-white/15 p-3"
      style={{ backgroundColor: "rgba(2,6,23,0.45)" }}
    >
      <input type="hidden" name="agreement_id" value={agreementId} />
      <input type="hidden" name="period_id" value={periodId} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-300">
          Amount received (₱)
        </span>
        <input
          name="amount"
          required
          inputMode="decimal"
          defaultValue={amountDefault}
          placeholder="e.g. 8500"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />
      </label>
      <p className="text-xs text-slate-400">
        {demo
          ? "👀 Sample preview — on your real unit this records the payment and updates the balance."
          : "We'll update this month's balance automatically. If it's a partial payment, just enter what was received."}
      </p>
      <div className="flex gap-2">
        {demo ? (
          <button
            type="button"
            disabled
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white opacity-60"
          >
            Sample preview
          </button>
        ) : (
          <SubmitButton />
        )}
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
