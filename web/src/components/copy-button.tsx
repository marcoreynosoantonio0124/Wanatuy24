"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked; user can select manually */
        }
      }}
      className={`rounded-md border px-3 py-1.5 text-sm transition active:scale-95 ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-300 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
      }`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
