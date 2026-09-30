"use client";

import { useActionState } from "react";
import {
  uploadContract,
  type ContractState,
} from "@/app/(app)/agreements/[id]/actions";

/** Upload / replace box for an agreement's signed contract. */
export function ContractBox({
  agreementId,
  hasContract,
}: {
  agreementId: string;
  hasContract: boolean;
}) {
  const [state, action, pending] = useActionState<ContractState, FormData>(
    uploadContract,
    {},
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <input type="hidden" name="agreement_id" value={agreementId} />
      <label className="block text-sm font-medium text-slate-700">
        {hasContract ? "Replace contract file" : "Attach the signed contract"}
      </label>
      <p className="mt-0.5 text-xs text-slate-500">
        PDF or photo (JPG/PNG/WebP), up to 20 MB. Kept private in your vault.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900 active:scale-95 disabled:opacity-60"
        >
          {pending && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {pending ? "Uploading…" : hasContract ? "Replace" : "Upload"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="mt-2 text-sm text-emerald-700">Contract saved ✓</p>
      )}
    </form>
  );
}
