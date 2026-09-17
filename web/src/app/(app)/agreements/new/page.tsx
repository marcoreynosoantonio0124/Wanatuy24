import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AgreementForm } from "@/components/agreement-form";
import type { AssetRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NewAgreementPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("assets")
    .select("id, label")
    .order("created_at", { ascending: false });
  const assets = (data ?? []) as Pick<AssetRow, "id" | "label">[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New agreement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set the terms once — we&apos;ll generate every due date and reminder.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-slate-600">You need a unit first.</p>
          <Link
            href="/assets"
            className="mt-2 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add a unit
          </Link>
        </div>
      ) : (
        <AgreementForm assets={assets} />
      )}
    </div>
  );
}
