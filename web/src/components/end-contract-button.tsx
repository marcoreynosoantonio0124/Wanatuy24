"use client";

import { endAgreement } from "@/app/(app)/agreements/actions";

/**
 * Ends an active contract. The unit then goes back to "Open for leasing" on the
 * dashboard and the finished agreement moves into History. Confirms first,
 * since this closes out the tenant.
 */
export function EndContractButton({ agreementId }: { agreementId: string }) {
  return (
    <form action={endAgreement}>
      <input type="hidden" name="agreement_id" value={agreementId} />
      <button
        type="submit"
        onClick={(e) => {
          if (
            !window.confirm(
              "End this contract? The unit becomes open for leasing again, and this agreement moves to your History (records are kept).",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-95"
      >
        🚪 End this contract
      </button>
    </form>
  );
}
