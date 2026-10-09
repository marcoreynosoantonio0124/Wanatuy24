import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { signUnitPhotos } from "@/lib/unit-photos";
import { UnitPhotosManager } from "@/components/unit-photos";
import type { AssetRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  house: "House",
  room: "Room",
  apartment: "Apartment",
  commercial: "Commercial",
  car: "Car",
  motorcycle: "Motorcycle",
  other: "Other",
};

export default async function UnitDetailPage({
  params,
}: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS scopes this to the lessor's own asset.
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const asset = data as AssetRow;

  // Occupied? (drives the status pill + a shortcut to the rent view).
  const { data: activeAg } = await supabase
    .from("agreements")
    .select("id")
    .eq("asset_id", id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const activeAgreementId = (activeAg as { id: string } | null)?.id ?? null;

  const admin = createAdminClient();
  const signed = await signUnitPhotos(admin, asset.photo_paths);
  const photos = asset.photo_paths.map((path, i) => ({
    path,
    url: signed[i],
  })).filter((p) => p.url);

  return (
    <div className="space-y-5">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-900 active:scale-95"
      >
        ← Units
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{asset.label}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {TYPE_LABEL[asset.type] ?? asset.type}
        </span>
        {activeAgreementId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Vacant
          </span>
        )}
      </div>

      {asset.address_text && (
        <p className="text-sm text-slate-500">{asset.address_text}</p>
      )}

      <UnitPhotosManager assetId={asset.id} photos={photos} />

      {activeAgreementId && (
        <Link
          href={`/dashboard/unit/${activeAgreementId}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 active:scale-95"
        >
          💸 Open rent &amp; tenant details →
        </Link>
      )}
    </div>
  );
}
