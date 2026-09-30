"use client";

import { useState, useTransition } from "react";
import { markProofSeen } from "@/app/(app)/agreements/[id]/actions";

/**
 * The "message from tenant" cell. Blinks while a proof is unseen; opening it
 * (view or download) marks it seen so it stops blinking. Also offers a download
 * of the original image the tenant sent.
 */
export function ProofCell({
  proofId,
  agreementId,
  viewUrl,
  downloadUrl,
  seen,
  caption,
}: {
  proofId: string;
  agreementId: string;
  viewUrl: string | null;
  downloadUrl: string | null;
  seen: boolean;
  caption: string;
}) {
  const [isSeen, setIsSeen] = useState(seen);
  const [, startTransition] = useTransition();

  function markSeen() {
    if (isSeen) return;
    setIsSeen(true);
    const fd = new FormData();
    fd.set("proof_id", proofId);
    fd.set("agreement_id", agreementId);
    startTransition(() => {
      void markProofSeen(fd);
    });
  }

  function open() {
    if (viewUrl) window.open(viewUrl, "_blank", "noopener,noreferrer");
    markSeen();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={open}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
          isSeen
            ? "border border-slate-200 bg-slate-50 text-slate-600"
            : "animate-pulse bg-blue-50 text-blue-700 ring-2 ring-blue-300"
        }`}
      >
        {isSeen ? "👁️ View proof" : "🔔 New proof — tap to view"}
      </button>
      {caption && <span className="text-xs text-slate-500">{caption}</span>}
      {downloadUrl && (
        <a
          href={downloadUrl}
          onClick={markSeen}
          className="text-xs font-medium text-emerald-700 underline transition hover:text-emerald-900"
        >
          ⬇️ Download image
        </a>
      )}
    </div>
  );
}
