"use client";

import { useEffect, useState } from "react";

/**
 * A full-screen in-app viewer for a document (an ID photo, a signed contract, a
 * payment proof). Shows the file in an iframe (the browser's own viewer gives
 * pinch-zoom for both images and PDFs) with a clear "← Back", instead of leaving
 * the app for a raw file URL in a new browser tab. "Open ↗" stays as a fallback.
 */
export function DocOverlay({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind the overlay from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
        >
          ← Back
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-slate-200">
          {label}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 active:scale-95"
        >
          Open ↗
        </a>
      </div>
      <div className="min-h-0 flex-1 bg-slate-900">
        <iframe src={href} title={label} className="h-full w-full border-0" />
      </div>
    </div>
  );
}

/**
 * A "View" button that opens the given document inside the app (overlay), not a
 * new browser tab.
 */
export function DocViewButton({
  href,
  label,
  className,
  children,
}: {
  href: string;
  /** Shown in the overlay's title bar (e.g. "Jason's valid ID"). */
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
        }
      >
        {children ?? "View"}
      </button>
      {open && (
        <DocOverlay href={href} label={label} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
