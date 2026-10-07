"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "@/app/welcome/actions";

/**
 * The one-time profile form every new account fills in after choosing a role —
 * the basic record (name, address, birthdate, civil status, suffix) plus a
 * photo of a valid ID, for transparency between lessors and renters.
 */
export function ProfileForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {},
  );
  const field =
    "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30";
  const label = "block text-sm font-medium text-slate-200";

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={label}>Full name</span>
          <input
            name="full_name"
            required
            defaultValue={defaultName}
            placeholder="Juan Dela Cruz"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>Suffix</span>
          <select name="suffix" defaultValue="" className={field}>
            <option value="">None</option>
            <option value="Jr.">Jr.</option>
            <option value="Sr.">Sr.</option>
            <option value="II">II</option>
            <option value="III">III</option>
            <option value="IV">IV</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className={label}>Home address</span>
        <input
          name="address"
          required
          placeholder="123 Mabini St, Brgy. Poblacion, Lipa City, Batangas"
          className={field}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Birthdate</span>
          <input name="birthdate" type="date" required className={field} />
        </label>
        <label className="block">
          <span className={label}>Civil status</span>
          <select name="marital_status" required defaultValue="" className={field}>
            <option value="" disabled>
              Select…
            </option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
            <option value="Divorced">Divorced</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className={label}>Mobile number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={defaultPhone}
          placeholder="0917 123 4567"
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>Photo of your valid ID</span>
        <input
          name="valid_id"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/20 file:px-3 file:py-1.5 file:text-emerald-200"
        />
        <span className="mt-1 block text-xs text-slate-400">
          Kept private — only shown to the other party in an agreement you both
          signed, for transparency.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-300">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}
        {pending ? "Saving…" : "Save & continue"}
      </button>
    </form>
  );
}
