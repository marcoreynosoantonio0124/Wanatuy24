import { requireUser } from "@/lib/auth";
import { AssetForm } from "@/components/asset-form";
import type { AssetRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const TYPE_ICON: Record<string, string> = {
  house: "🏠",
  room: "🚪",
  apartment: "🏢",
  commercial: "🏬",
  car: "🚗",
  motorcycle: "🏍️",
  other: "📦",
};

export default async function AssetsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });
  const assets = (data ?? []) as AssetRow[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Units</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Add a unit
        </h2>
        <AssetForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your units ({assets.length})
        </h2>
        {assets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            No units yet. Add your first one above.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {assets.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {TYPE_ICON[a.type] ?? "📦"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {a.label}
                    </p>
                    {a.address_text && (
                      <p className="text-sm text-slate-500">{a.address_text}</p>
                    )}
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      {a.type}
                    </p>
                  </div>
                </div>

                {a.address_text && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-emerald-700">
                      📍 See on map
                    </summary>
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                      <iframe
                        title={`Map of ${a.label}`}
                        loading="lazy"
                        className="h-48 w-full border-0"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                          a.address_text,
                        )}&output=embed`}
                      />
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        a.address_text,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-emerald-700 underline"
                    >
                      Open in Google Maps ↗
                    </a>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
