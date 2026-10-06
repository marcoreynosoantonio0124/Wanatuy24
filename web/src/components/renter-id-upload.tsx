"use client";

import { useActionState } from "react";
import { uploadRenterId, type RenterIdState } from "@/app/r/[token]/actions";

/** Lets the renter upload a photo of their ID (verification). Kept private. */
export function RenterIdUpload({
  token,
  hasId,
}: {
  token: string;
  hasId: boolean;
}) {
  const [state, action, pending] = useActionState<RenterIdState, FormData>(
    uploadRenterId,
    {},
  );

  const done = state.ok || hasId;

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold text-slate-800">
            🪪 Verify your identity
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {done
              ? "Your ID is on file — kept private."
              : "Upload a photo of your valid ID. Kept private — only you and your landlord can view it."}
          </span>
        </p>
        {done && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            ✓ Uploaded
          </span>
        )}
      </div>

      {!done && (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="token" value={token} />
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            required
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
          >
            {pending && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {pending ? "Uploading…" : "Upload ID"}
          </button>
        </form>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
