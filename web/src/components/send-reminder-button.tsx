"use client";

import { useState } from "react";

/**
 * Opens the phone's native share sheet (Viber / Messenger / SMS / …) with a
 * ready-made reminder. Falls back to copying the text on desktop or when the
 * Web Share API is unavailable.
 */
export function SendReminderButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (err) {
        // User dismissed the share sheet — do nothing.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Otherwise fall through to the copy fallback.
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing we can do */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
    >
      {copied ? "Copied ✓" : "📤 Send reminder"}
    </button>
  );
}
