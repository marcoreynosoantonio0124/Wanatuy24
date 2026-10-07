"use client";

import { useActionState, useState } from "react";
import { submitProof, type ProofState } from "@/app/r/[token]/actions";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";
import type { PaymentMethod } from "@/lib/database.types";

/**
 * A per-month "Upload proof of payment" button on the renter's rental detail.
 * Reveals a compact proof form targeted at one specific due date (period),
 * reusing the existing submitProof action.
 */
export function MonthProofButton({
  token,
  periodId,
  defaultAmountCentavos,
  methods,
  demo = false,
}: {
  token: string;
  periodId: string;
  defaultAmountCentavos: number;
  methods: PaymentMethod[];
  /** Sample preview: show the UI but don't actually submit. */
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ProofState, FormData>(
    submitProof,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900";
  const amountDefault =
    defaultAmountCentavos > 0 ? (defaultAmountCentavos / 100).toFixed(2) : "";

  if (state.ok) {
    return (
      <p className="mt-3 text-sm font-semibold text-emerald-300">
        ✓ Proof sent — your lessor will review it.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
      >
        📤 Upload proof of payment
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-3 space-y-3 rounded-xl border border-white/15 p-3"
      style={{ backgroundColor: "rgba(2,6,23,0.45)" }}
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="period_id" value={periodId} />
      {demo && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          👀 Sample preview — on a real renter account this uploads the proof.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-300">Method</span>
          <select name="method" required className={input}>
            {methods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-300">Amount (₱)</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={amountDefault}
            className={input}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-300">Date paid</span>
          <input
            name="paid_on"
            type="date"
            required
            defaultValue={today}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-300">
            Reference no. <span className="text-slate-500">(optional)</span>
          </span>
          <input name="reference_no" className={input} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-300">
          Receipt / screenshot <span className="text-slate-500">(optional)</span>
        </span>
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/20 file:px-3 file:py-1.5 file:text-emerald-300"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-300">
          Note <span className="text-slate-500">(optional)</span>
        </span>
        <input name="note" placeholder="Sent via GCash" className={input} />
      </label>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || demo}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {demo ? "Sample preview" : pending ? "Sending…" : "Send payment proof"}
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
