import Link from "next/link";

/** Read-only notice shown above any dashboard the admin is previewing. */
export function PreviewBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-4 py-3 backdrop-blur">
      <div className="min-w-0">
        <p className="text-sm font-bold text-indigo-200">👁️ {title}</p>
        {subtitle && (
          <p className="truncate text-xs text-indigo-300/80">{subtitle}</p>
        )}
      </div>
      <Link
        href="/admin"
        className="shrink-0 rounded-lg border border-indigo-400/40 px-3 py-1.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/20 active:scale-95"
      >
        ← Command Center
      </Link>
    </div>
  );
}
