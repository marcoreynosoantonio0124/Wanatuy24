"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DocOverlay } from "@/components/doc-viewer";
import { removeValidId } from "@/app/(app)/profile/actions";

/**
 * "View your ID" on the profile page. Opens the ID inside the app (compact and
 * centered) with a way back to the profile, plus Download / Change / Remove.
 * Change and Remove each show a short reminder first, because replacing or
 * removing the ID affects the ✅ Verified badge.
 */
export function ProfileIdViewer({
  viewUrl,
  downloadUrl,
  verified,
}: {
  viewUrl: string;
  downloadUrl: string | null;
  verified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "change" | "remove">(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPanel(null);
    setError("");
  }

  function confirmRemove() {
    setError("");
    startTransition(async () => {
      const res = await removeValidId();
      if (res.error) setError(res.error);
      else close();
    });
  }

  const btn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition active:scale-95";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-emerald-300 transition hover:bg-white/10 active:scale-95"
      >
        🪪 View your ID
      </button>

      {open && (
        <DocOverlay
          href={viewUrl}
          label="Your valid ID"
          backLabel="← Back to profile"
          onClose={close}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className={`${btn} border-white/20 bg-white/10 text-white hover:bg-white/20`}
                >
                  ⬇️ Download
                </a>
              )}
              <button
                type="button"
                onClick={() => setPanel(panel === "change" ? null : "change")}
                className={`${btn} border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
              >
                🔄 Change
              </button>
              <button
                type="button"
                onClick={() => setPanel(panel === "remove" ? null : "remove")}
                className={`${btn} border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20`}
              >
                🗑️ Remove
              </button>
            </div>

            {panel === "change" && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-100">
                {verified ? (
                  <p>
                    <span className="font-semibold">Replace your valid ID?</span>{" "}
                    Our system will check the new one again. To keep your
                    Verified badge ✅, it must be a clear, valid government ID
                    with your name.
                  </p>
                ) : (
                  <p>
                    <span className="font-semibold">Replacing your ID?</span> Our
                    system will check it again, and once it passes, you&apos;ll
                    get the Verified badge ✅ on your profile.
                  </p>
                )}
                <Link
                  href="/profile/edit"
                  className="mt-3 inline-flex items-center rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-95"
                >
                  Continue — upload a new ID →
                </Link>
              </div>
            )}

            {panel === "remove" && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-100">
                {verified ? (
                  <p>
                    <span className="font-semibold">Remove your valid ID?</span>{" "}
                    Your Verified badge ✅ will be removed too. You can upload a
                    new valid ID anytime and our system will check it to get it
                    back.
                  </p>
                ) : (
                  <p>
                    <span className="font-semibold">Remove your ID?</span> You can
                    upload a new one anytime and our system will check it again,
                    and once it passes, you&apos;ll get the Verified badge ✅ on
                    your profile.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={confirmRemove}
                    disabled={pending}
                    className="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-400 active:scale-95 disabled:opacity-60"
                  >
                    {pending ? "Removing…" : "Yes, remove it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    disabled={pending}
                    className="rounded-lg border border-white/20 px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 active:scale-95"
                  >
                    Keep it
                  </button>
                </div>
                {error && <p className="mt-2 text-red-300">{error}</p>}
              </div>
            )}

            <p className="text-center text-xs text-slate-400">
              Private — only shown to the other party in an agreement you both
              signed.
            </p>
          </div>
        </DocOverlay>
      )}
    </>
  );
}
