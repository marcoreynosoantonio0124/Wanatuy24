"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type AvatarState = { error?: string; ok?: boolean };

const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

/** Uploads a profile photo to the public avatars bucket and saves its URL. */
export async function updateAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const { user } = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }
  if (file.size > MAX_BYTES) return { error: "That photo is larger than 5 MB." };
  if (!ALLOWED.includes(file.type))
    return { error: "Upload a PNG, JPG, or WebP photo." };

  const admin = createAdminClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return { error: `Photo upload failed: ${upErr.message}` };

  const { data: pub } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error } = await admin
    .from("users")
    .update({ avatar_url: pub.publicUrl })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
