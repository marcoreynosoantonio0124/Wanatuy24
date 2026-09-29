"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "./actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    updatePassword,
    {},
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="block text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Type it again"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
