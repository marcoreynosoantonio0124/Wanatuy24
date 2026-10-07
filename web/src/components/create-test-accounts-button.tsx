"use client";

import { useActionState } from "react";
import { createTestAccounts } from "@/app/(app)/admin/actions";

/**
 * One-tap "make me a test landlord + renter" button for the Command Center, so
 * the admin can start an end-to-end run-through without spare email addresses.
 */
export function CreateTestAccountsButton() {
  const [, action, pending] = useActionState(async () => {
    await createTestAccounts();
    return null;
  }, null);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-95 disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
          />
        )}
        {pending ? "Creating…" : "🧪 Create test landlord & renter"}
      </button>
    </form>
  );
}
