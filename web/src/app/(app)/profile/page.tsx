import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileIdViewer } from "@/components/profile-id-viewer";

export const dynamic = "force-dynamic";

type Me = {
  role?: string | null;
  is_admin?: boolean | null;
  full_name?: string | null;
  suffix?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  employer?: string | null;
  work_address?: string | null;
  spouse_name?: string | null;
  children_count?: number | null;
  avatar_url?: string | null;
  valid_id_file_path?: string | null;
  id_verified?: boolean | null;
  id_is_government?: boolean | null;
  id_expired?: boolean | null;
  id_doc_type?: string | null;
  profile_completed?: boolean | null;
};

function formatBirthdate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function show(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default async function ProfilePage() {
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("users")
    .select(
      "role, is_admin, full_name, suffix, email, phone, address, birthdate, marital_status, occupation, employer, work_address, spouse_name, children_count, avatar_url, valid_id_file_path, id_verified, id_is_government, id_expired, id_doc_type, profile_completed",
    )
    .eq("id", user.id)
    .single();
  const me = (data as Me | null) ?? {};

  if (me.is_admin) redirect("/admin");
  if (!me.role) redirect("/welcome");
  if (!me.profile_completed) redirect("/welcome/profile");

  // Signed URL for the private ID (1 hour), shown only to the owner here.
  let idUrl: string | null = null;
  let idDownloadUrl: string | null = null;
  if (me.valid_id_file_path) {
    const admin = createAdminClient();
    const ext = me.valid_id_file_path.includes(".")
      ? me.valid_id_file_path.split(".").pop()
      : "jpg";
    const [{ data: signed }, { data: dl }] = await Promise.all([
      admin.storage.from("ids").createSignedUrl(me.valid_id_file_path, 60 * 60),
      admin.storage
        .from("ids")
        .createSignedUrl(me.valid_id_file_path, 60 * 60, {
          download: `my-valid-id.${ext}`,
        }),
    ]);
    idUrl = signed?.signedUrl ?? null;
    idDownloadUrl = dl?.signedUrl ?? null;
  }

  // Verified only with a mobile number AND a confirmed government ID whose name
  // matches the account.
  const hasId = Boolean(me.valid_id_file_path);
  const verified = Boolean(me.phone) && hasId && me.id_verified === true;
  // Why an on-file ID isn't verifying: a non-government ID, an expired one, or a
  // name mismatch on a valid government ID.
  const idNotGov = hasId && me.id_is_government === false;
  const idExpired =
    hasId && me.id_is_government === true && me.id_expired === true && !verified;
  const idNameMismatch =
    hasId &&
    me.id_is_government === true &&
    me.id_expired !== true &&
    me.id_verified !== true;
  const fullName =
    [me.full_name, me.suffix].filter(Boolean).join(" ") ||
    (user.email ?? "").split("@")[0];
  const initials = (me.full_name ?? user.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isRenter = me.role === "tenant";

  const rows: Array<[string, string]> = [
    ["Email", show(user.email)],
    ["Mobile number", show(me.phone)],
    ["Home address", show(me.address)],
    ["Birthdate", formatBirthdate(me.birthdate)],
    ["Civil status", show(me.marital_status)],
    ["Occupation", show(me.occupation)],
    ["Work / Company", show(me.employer)],
    ["Work address", show(me.work_address)],
    ["Spouse's name", show(me.spouse_name)],
    [
      "Children",
      me.children_count === null || me.children_count === undefined
        ? "—"
        : String(me.children_count),
    ],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My profile</h1>
        <Link
          href="/profile/edit"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95"
        >
          ✏️ Edit profile
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <AvatarUploader avatarUrl={me.avatar_url ?? null} initials={initials} />
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold">{fullName}</h2>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  ✅ Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-white/10">
                  Unverified
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              {isRenter ? "Renter" : "Lessor"} account
            </p>
          </div>
        </div>

        {!verified && (
          <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {idExpired ? (
              <>
                Your {me.id_doc_type ?? "ID"} looks <b>expired</b>, so the{" "}
                <b>✅ Verified</b> badge isn&apos;t granted. Upload a{" "}
                <b>valid (unexpired) government ID</b>
                {me.phone ? "" : " and add your mobile number"}.{" "}
                <Link href="/profile/edit" className="underline">
                  Update it
                </Link>
                .
              </>
            ) : idNameMismatch ? (
              <>
                The name on your {me.id_doc_type ?? "ID"} doesn&apos;t match your
                account name, so the <b>✅ Verified</b> badge isn&apos;t granted.
                Make your <b>Full name</b> match your ID (middle name can differ)
                {me.phone ? "" : ", and add your mobile number"}.{" "}
                <Link href="/profile/edit" className="underline">
                  Update it
                </Link>
                .
              </>
            ) : idNotGov ? (
              <>
                Your {me.id_doc_type ?? "ID"} is on file, but the{" "}
                <b>✅ Verified</b> badge needs a <b>government-issued ID</b>{" "}
                (e.g. Driver&apos;s License, National ID, Passport, UMID)
                {me.phone ? "" : " and your mobile number"}.{" "}
                <Link href="/profile/edit" className="underline">
                  Update it
                </Link>
                .
              </>
            ) : (
              <>
                Add your mobile number and a photo of a{" "}
                <b>government-issued ID</b> (name must match your account) to earn
                the <b>✅ Verified</b> badge.{" "}
                <Link href="/profile/edit" className="underline">
                  Complete it
                </Link>
                .
              </>
            )}
          </p>
        )}

        <dl className="mt-5 divide-y divide-white/5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-sm text-slate-400">{k}</dt>
              <dd className="text-right text-sm font-medium text-slate-100">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="text-sm text-slate-400">Valid ID on file</p>
          {idUrl ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProfileIdViewer
                viewUrl={idUrl}
                downloadUrl={idDownloadUrl}
                verified={verified}
              />
              {me.id_doc_type && (
                <span className="text-xs text-slate-400">
                  {me.id_doc_type}
                  {me.id_verified
                    ? " · ✅ government ID"
                    : me.id_is_government === true
                      ? me.id_expired === true
                        ? " · government ID (expired)"
                        : " · government ID (name mismatch)"
                      : " · not a government ID"}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              None yet —{" "}
              <Link href="/profile/edit" className="text-emerald-300 underline">
                add one
              </Link>
              .
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Kept private — only shown to the other party in an agreement you both
            signed.
          </p>
        </div>
      </div>
    </div>
  );
}
