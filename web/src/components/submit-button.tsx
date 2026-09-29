"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that reacts the instant it's tapped: it reads the parent
 * form's pending state (useFormStatus), disables itself, and swaps in a
 * "working" label + spinner — so users get immediate feedback instead of
 * clicking and wondering whether anything happened.
 */
export function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-1.5 transition disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {pending && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
