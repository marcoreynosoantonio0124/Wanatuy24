"use client";

import { actAsUser } from "@/app/(app)/admin/actions";

/**
 * Admin-only "Act as this user" button. Signs the admin into the user's real
 * account for an end-to-end test; a banner + "Back to Command Center" let them
 * step out again. Confirms first, since it switches who you're signed in as.
 */
export function ActAsButton({ userId }: { userId: string }) {
  return (
    <form action={actAsUser}>
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        onClick={(e) => {
          if (
            !window.confirm(
              "Sign in as this user to test everything they can do? A yellow bar will let you jump back to your Command Center.",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-700 active:scale-95"
      >
        Act as →
      </button>
    </form>
  );
}
