import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { EditAgreementForm } from "@/components/edit-agreement-form";
import type { AgreementRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function EditAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const agreement = data as AgreementRow;
  if (agreement.lessor_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/agreements/${id}`}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          ← Back to {agreement.renter_name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit agreement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update contacts, payment settings, and status.
        </p>
      </div>
      <EditAgreementForm agreement={agreement} />
    </div>
  );
}
