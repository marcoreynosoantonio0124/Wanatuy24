"use client";

import { useActionState } from "react";
import {
  joinByTransactionNo,
  type JoinUnitState,
} from "@/app/(app)/my-rentals/actions";

/**
 * Lets a renter join a unit by typing the transaction number their landlord
 * gave them. On success the unit auto-populates on their dashboard.
 */
export function JoinUnitForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<JoinUnitState, FormData>(
    joinByTransactionNo,
    {},
  );

  return (
    <form
      action={action}
      className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 backdrop-blur-md"
    >
      <label
        htmlFor="transaction_no"
        className="block text-sm font-bold text-white"
      >
        🔑 Join a unit
      </label>
      <p className="mt-0.5 text-xs text-white/80">
        {compact
          ? "Enter the transaction number from your landlord."
          : "Got a transaction number from your landlord? Enter it here and your unit shows up automatically."}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <input
          id="transaction_no"
          name="transaction_no"
          required
          autoCapitalize="characters"
          placeholder="DM-7KQ3PX2M"
          className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/90 px-3 py-2 font-mono text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {pending ? "Joining…" : "Join unit"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-sm font-medium text-red-200">{state.error}</p>
      )}
    </form>
  );
}
