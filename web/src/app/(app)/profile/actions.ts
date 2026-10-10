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

/**
 * Removes the signed-in user's valid ID: deletes the stored file and clears the
 * ID + its verification verdict, so the ✅ Verified badge goes away until a new
 * ID is uploaded (and passes the scan). Owner-only — keyed on the session user.
 */
export async function removeValidId(): Promise<{ error?: string }> {
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from("users")
    .select("valid_id_file_path")
    .eq("id", user.id)
    .single();
  const path = (data as { valid_id_file_path?: string | null } | null)
    ?.valid_id_file_path;

  const { error } = await admin
    .from("users")
    .update({
      valid_id_file_path: null,
      id_verified: false,
      id_is_government: null,
      id_expired: null,
      id_doc_type: null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  // Best-effort file cleanup; the record is already cleared either way.
  if (path) await admin.storage.from("ids").remove([path]);

  revalidatePath("/profile");
  return {};
}
