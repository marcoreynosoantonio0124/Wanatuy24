"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addUnitPhotos,
  removeUnitPhoto,
  type PhotoFormState,
} from "@/app/(app)/assets/actions";

export type UnitPhoto = { path: string; url: string };

const MAX = 5;

/**
 * Manage a unit's optional photos (up to MAX). The first is the cover. Lives on
 * the unit's own detail page so the Add-a-unit form stays short. Picking files
 * auto-submits; each photo has a remove (✕) button.
 */
export function UnitPhotosManager({
  assetId,
  photos,
}: {
  assetId: string;
  photos: UnitPhoto[];
}) {
  const [state, action, pending] = useActionState<PhotoFormState, FormData>(
    addUnitPhotos,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const full = photos.length >= MAX;

  useEffect(() => {
    if (!pending) {
      // Clear the chosen files whether it succeeded or errored, so the picker
      // is ready for the next try.
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [pending, state]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          📷 Photos
          <span className="text-sm font-normal text-slate-400">
            {photos.length}/{MAX}
          </span>
        </h2>

        <form ref={formRef} action={action}>
          <input type="hidden" name="asset_id" value={assetId} />
          <input
            ref={fileRef}
            type="file"
            name="photos"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <button
            type="button"
            disabled={pending || full}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            {pending && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {pending ? "Uploading…" : "＋ Add photos"}
          </button>
        </form>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        For the record (move-in condition — what the renter is getting). Shown to
        your renter in the agreement. The first photo is the cover. Optional.
      </p>

      {full && !pending && (
        <p className="mt-2 text-sm text-amber-600">
          You&apos;ve added the maximum of {MAX} photos. Remove one to add another.
        </p>
      )}
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}

      {photos.length === 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="mt-4 grid h-36 w-full place-items-center rounded-xl border-2 border-dashed border-slate-300 text-center text-sm text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
        >
          <span>
            <span className="block text-2xl">＋</span>
            Add a few photos
          </span>
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div
              key={p.path}
              className="relative h-32 w-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Unit photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  ★ Cover
                </span>
              )}
              <form action={removeUnitPhoto}>
                <input type="hidden" name="asset_id" value={assetId} />
                <input type="hidden" name="path" value={p.path} />
                <button
                  type="submit"
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-slate-900/70 text-sm text-white transition hover:bg-red-600 active:scale-90"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
