import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { updateProfile } from "@/app/welcome/actions";

export const dynamic = "force-dynamic";

type Me = {
  role?: string | null;
  is_admin?: boolean | null;
  full_name?: string | null;
  suffix?: string | null;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  employer?: string | null;
  work_address?: string | null;
  spouse_name?: string | null;
  children_count?: number | null;
  valid_id_file_path?: string | null;
  profile_completed?: boolean | null;
};

export default async function EditProfilePage() {
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("users")
    .select(
      "role, is_admin, full_name, suffix, phone, address, birthdate, marital_status, occupation, employer, work_address, spouse_name, children_count, valid_id_file_path, profile_completed",
    )
    .eq("id", user.id)
    .single();
  const me = (data as Me | null) ?? {};

  if (me.is_admin) redirect("/admin");
  if (!me.role) redirect("/welcome");
  if (!me.profile_completed) redirect("/welcome/profile");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit profile</h1>
        <Link
          href="/profile"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <ProfileForm
          action={updateProfile}
          submitLabel="Save changes"
          isEdit
          defaults={{
            full_name: me.full_name ?? "",
            suffix: me.suffix ?? "",
            address: me.address ?? "",
            birthdate: me.birthdate ?? "",
            marital_status: me.marital_status ?? "",
            phone: me.phone ?? "",
            occupation: me.occupation ?? "",
            employer: me.employer ?? "",
            work_address: me.work_address ?? "",
            spouse_name: me.spouse_name ?? "",
            children_count:
              me.children_count == null ? "" : String(me.children_count),
            hasId: Boolean(me.valid_id_file_path),
          }}
        />
      </div>
    </div>
  );
}
