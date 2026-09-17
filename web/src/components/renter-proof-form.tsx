"use client";

import { useActionState } from "react";
import { submitProof, type ProofState } from "@/app/r/[token]/actions";
import { PAYMENT_METHOD_LABELS, formatPeso, formatDate } from "@/lib/format";
import type { PaymentMethod } from "@/lib/database.types";

type PeriodOption = { id: string; due_date: string; amount_php: number };

export function RenterProofForm({
  token,
  periods,
  methods,
}: {
  token: string;
  periods: PeriodOption[];
  methods: PaymentMethod[];
}) {
  const [state, action, pending] = useActionState<ProofState, FormData>(
    submitProof,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900";

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thanks! Your payment proof was sent to your lessor for review.
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Which due date?</span>
        <select name="period_id" required className={input}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {formatDate(p.due_date)} — {formatPeso(p.amount_php)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Method</span>
          <select name="method" required className={input}>
            {methods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Amount (₱)</span>
          <input name="amount" required inputMode="decimal" className={input} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Date paid</span>
          <input
            name="paid_on"
            type="date"
            required
            defaultValue={today}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Reference no. <span className="text-slate-400">(optional)</span>
          </span>
          <input name="reference_no" className={input} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Receipt / screenshot <span className="text-slate-400">(optional)</span>
        </span>
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Note <span className="text-slate-400">(optional)</span>
        </span>
        <input name="note" placeholder="Sent via GCash" className={input} />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send payment proof"}
      </button>
    </form>
  );
}
