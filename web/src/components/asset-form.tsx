"use client";

import { useActionState, useRef, useEffect } from "react";
import { createAsset, type AssetFormState } from "@/app/(app)/assets/actions";

const TYPES: { value: string; label: string }[] = [
  { value: "room", label: "Room" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "car", label: "Car" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "other", label: "Other" },
];

export function AssetForm() {
  const [state, action, pending] = useActionState<AssetFormState, FormData>(
    createAsset,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Type</span>
          <select
            name="type"
            defaultValue="room"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Label</span>
          <input
            name="label"
            required
            placeholder="Unit 2B, Sampaloc"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Address <span className="text-slate-400">(optional)</span>
        </span>
        <input
          name="address_text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add unit"}
      </button>
    </form>
  );
}
