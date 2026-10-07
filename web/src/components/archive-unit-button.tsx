"use client";

import { archiveAsset } from "@/app/(app)/assets/actions";

/**
 * "Delete" a vacant unit. It's a soft archive (the unit's history is kept), but
 * we still confirm first so a tap doesn't remove a property by accident.
 */
export function ArchiveUnitButton({ assetId }: { assetId: string }) {
  return (
    <form action={archiveAsset}>
      <input type="hidden" name="asset_id" value={assetId} />
      <button
        type="submit"
        onClick={(e) => {
          if (
            !window.confirm(
              "Delete this unit? Its past records stay in your History. Choose Cancel to keep it open for leasing.",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="rounded-lg border border-red-300/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 active:scale-95"
      >
        🗑 Delete
      </button>
    </form>
  );
}
