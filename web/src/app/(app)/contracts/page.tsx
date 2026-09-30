import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CONTRACT_BUCKET = "contracts";

type Row = {
  id: string;
  renter_name: string;
  contract_file_path: string | null;
  asset: { label: string; type: string } | null;
};

export default async function ContractsPage() {
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("agreements")
    .select("id, renter_name, contract_file_path, asset:assets(label, type)")
    .eq("lessor_id", user.id)
    .not("contract_file_path", "is", null)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  // Signed view/download links.
  const admin = createAdminClient();
  const links = new Map<string, { view: string | null; download: string | null }>();
  await Promise.all(
    rows.map(async (r) => {
      if (!r.contract_file_path) return;
      const [{ data: v }, { data: d }] = await Promise.all([
        admin.storage
          .from(CONTRACT_BUCKET)
          .createSignedUrl(r.contract_file_path, 60 * 60),
        admin.storage
          .from(CONTRACT_BUCKET)
          .createSignedUrl(r.contract_file_path, 60 * 60, { download: true }),
      ]);
      links.set(r.id, {
        view: v?.signedUrl ?? null,
        download: d?.signedUrl ?? null,
      });
    }),
  );

  // Group by unit.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.asset?.label ?? "Other";
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your private file organizer — every signed contract, grouped by unit.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No contracts uploaded yet. 📄</p>
          <p className="mt-1 text-sm text-slate-400">
            Open an agreement and attach its signed contract — it&apos;ll show up
            here.
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([unit, list]) => (
          <section key={unit}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              🏢 {unit}
            </h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {list.map((r) => {
                const l = links.get(r.id);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📄</span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {r.renter_name}
                        </p>
                        <Link
                          href={`/agreements/${r.id}`}
                          className="text-xs font-medium text-emerald-700 underline transition hover:text-emerald-900"
                        >
                          Open agreement
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {l?.view && (
                        <a
                          href={l.view}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                        >
                          View
                        </a>
                      )}
                      {l?.download && (
                        <a
                          href={l.download}
                          className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 active:scale-95"
                        >
                          ⬇️ Download
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
