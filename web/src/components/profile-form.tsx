"use client";

import { useActionState, useState } from "react";
import type { ProfileState } from "@/app/welcome/actions";

export type ProfileDefaults = {
  full_name: string;
  suffix: string;
  address: string;
  birthdate: string; // YYYY-MM-DD
  marital_status: string;
  phone: string;
  occupation: string;
  employer: string;
  work_address: string;
  spouse_name: string;
  children_count: string; // "", a number, or "N/A"
  hasId: boolean;
};

const FIELD =
  "mt-1 h-[44px] w-full rounded-lg border border-white/15 bg-white/5 px-3 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-50";
// Native date inputs on iOS ignore the CSS width and size to their content, so
// the Birthdate box spills into the next column. `appearance-none` strips the
// native control so it respects width like a normal box; min-w-0 lets the grid
// column shrink; the webkit rules keep the value left-aligned and snug.
const DATE_FIELD = `${FIELD} min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:min-h-[1.2em]`;
const LABEL = "block text-sm font-medium text-slate-200";

/**
 * A text field with a small "N/A" toggle tucked inside the box, on the right.
 * Tap it to mark the detail "Not applicable"; tap again to type a value.
 */
function NAField({
  name,
  label,
  placeholder,
  defaultValue,
  inputMode,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue: string;
  inputMode?: "text" | "numeric";
}) {
  const [isNA, setIsNA] = useState(defaultValue === "N/A");
  const [value, setValue] = useState(defaultValue === "N/A" ? "" : defaultValue);
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <span className="relative mt-1 block">
        <input
          name={name}
          // readOnly (not disabled) so the "N/A" value still submits.
          value={isNA ? "N/A" : value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={isNA}
          inputMode={inputMode}
          placeholder={placeholder}
          className={`h-[44px] w-full rounded-lg border border-white/15 bg-white/5 pl-3 pr-16 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
            isNA ? "italic text-slate-400" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setIsNA((v) => !v)}
          aria-pressed={isNA}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold transition ${
            isNA
              ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/40"
              : "bg-white/10 text-slate-300 hover:bg-white/15"
          }`}
        >
          N/A
        </button>
      </span>
    </label>
  );
}

type IdStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; label: string }
  | { state: "warn"; label: string };

/**
 * The one-time profile form every account fills in (and can edit later):
 * the basic record (name, address, birthdate, civil status, suffix), livelihood
 * (occupation, employer, work address), family (spouse, children), a mobile
 * number, and a photo of a valid ID. Phone + ID are optional — without both,
 * the account simply doesn't earn the "Verified" badge yet.
 */
export function ProfileForm({
  action,
  defaults,
  submitLabel,
  isEdit = false,
}: {
  action: (prev: ProfileState, data: FormData) => Promise<ProfileState>;
  defaults: ProfileDefaults;
  submitLabel: string;
  isEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    action,
    {},
  );
  const [idStatus, setIdStatus] = useState<IdStatus>({ state: "idle" });

  async function checkId(file: File) {
    setIdStatus({ state: "checking" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/id/check", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.configured || !json?.ok || !json?.check) {
        // Dormant (no API key) or couldn't read — stay quiet.
        setIdStatus({ state: "idle" });
        return;
      }
      const c = json.check as {
        looks_like_id: boolean;
        has_photo: boolean;
        has_name: boolean;
        id_type: string | null;
      };
      if (c.looks_like_id && c.has_photo && c.has_name) {
        setIdStatus({
          state: "ok",
          label: `Looks like a valid ${c.id_type ?? "ID"} — photo and name detected.`,
        });
      } else {
        const missing: string[] = [];
        if (!c.has_photo) missing.push("a photo");
        if (!c.has_name) missing.push("a name");
        setIdStatus({
          state: "warn",
          label: missing.length
            ? `Hmm — we couldn't spot ${missing.join(" and ")}. Double-check the picture.`
            : "That doesn't look like an ID. Please upload a clear photo of a valid ID.",
        });
      }
    } catch {
      setIdStatus({ state: "idle" });
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={LABEL}>Full name</span>
          <input
            name="full_name"
            required
            defaultValue={defaults.full_name}
            placeholder="Juan Dela Cruz"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Suffix</span>
          <select name="suffix" defaultValue={defaults.suffix} className={FIELD}>
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
        <span className={LABEL}>Home address</span>
        <input
          name="address"
          required
          defaultValue={defaults.address}
          placeholder="123 Mabini St, Brgy. Poblacion, Lipa City, Batangas"
          className={FIELD}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={LABEL}>Birthdate</span>
          <input
            name="birthdate"
            type="date"
            required
            defaultValue={defaults.birthdate}
            className={DATE_FIELD}
          />
        </label>
        <label className="block min-w-0">
          <span className={LABEL}>Civil status</span>
          <select
            name="marital_status"
            required
            defaultValue={defaults.marital_status}
            className={FIELD}
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
          </select>
        </label>
      </div>

      {/* Livelihood */}
      <div className="grid gap-4 sm:grid-cols-2">
        <NAField
          name="occupation"
          label="Occupation"
          placeholder="e.g. Teacher"
          defaultValue={defaults.occupation}
        />
        <NAField
          name="employer"
          label="Work / Company"
          placeholder="e.g. SM Lipa"
          defaultValue={defaults.employer}
        />
      </div>
      <NAField
        name="work_address"
        label="Work address"
        placeholder="Where you work"
        defaultValue={defaults.work_address}
      />

      {/* Family */}
      <div className="grid gap-4 sm:grid-cols-2">
        <NAField
          name="spouse_name"
          label="Spouse's name (wife / husband)"
          placeholder="Full name"
          defaultValue={defaults.spouse_name}
        />
        <NAField
          name="children_count"
          label="Number of children"
          placeholder="e.g. 2"
          defaultValue={defaults.children_count}
          inputMode="numeric"
        />
      </div>

      <label className="block">
        <span className={LABEL}>Mobile number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={defaults.phone}
          placeholder="0917 123 4567"
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-slate-400">
          Optional — but needed for the ✅ Verified badge.
        </span>
      </label>

      <label className="block">
        <span className={LABEL}>Photo of your valid ID</span>
        <input
          name="valid_id"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void checkId(f);
            else setIdStatus({ state: "idle" });
          }}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/20 file:px-3 file:py-1.5 file:text-emerald-200"
        />
        {idStatus.state === "checking" && (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            Checking the photo…
          </span>
        )}
        {idStatus.state === "ok" && (
          <span className="mt-1 block text-xs text-emerald-300">
            ✓ {idStatus.label}
          </span>
        )}
        {idStatus.state === "warn" && (
          <span className="mt-1 block text-xs text-amber-300">
            ⚠️ {idStatus.label}
          </span>
        )}
        <span className="mt-1 block text-xs text-slate-400">
          {isEdit && defaults.hasId
            ? "An ID is already on file — upload a new one to replace it."
            : "Optional — but needed for the ✅ Verified badge. Kept private; only shown to the other party in an agreement you both signed."}
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
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
