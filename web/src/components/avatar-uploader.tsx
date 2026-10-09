"use client";

import { useActionState } from "react";
import { updateAvatar, type AvatarState } from "@/app/(app)/profile/actions";

/** Round profile photo with a small "change photo" control underneath. */
export function AvatarUploader({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null;
  initials: string;
}) {
  const [state, action, pending] = useActionState<AvatarState, FormData>(
    updateAvatar,
    {},
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/15 bg-white/5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
            {initials}
          </span>
        )}
      </div>
      <form action={action} className="flex flex-col items-center gap-1.5">
        <label className="cursor-pointer text-xs font-medium text-emerald-300 hover:text-emerald-200">
          {pending ? "Uploading…" : avatarUrl ? "Change photo" : "Add a photo"}
          <input
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) e.target.form?.requestSubmit();
            }}
          />
        </label>
        {state.error && <span className="text-xs text-red-300">{state.error}</span>}
      </form>
    </div>
  );
}
