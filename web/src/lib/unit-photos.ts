import type { SupabaseClient } from "@supabase/supabase-js";

export const UNIT_PHOTO_BUCKET = "unit-photos";

/**
 * Turns stored unit-photo paths into short-lived signed URLs, preserving order
 * (the first is the cover). The bucket is private, so every display goes through
 * a signed URL — like contracts, IDs and payment proofs. Pass a service-role
 * admin client (storage has no per-row policy). Returns [] on any failure so a
 * page never breaks over a photo.
 */
export async function signUnitPhotos(
  admin: SupabaseClient,
  paths: string[] | null | undefined,
  expiresIn = 60 * 60,
): Promise<string[]> {
  const list = (paths ?? []).filter(Boolean);
  if (list.length === 0) return [];
  try {
    const { data } = await admin.storage
      .from(UNIT_PHOTO_BUCKET)
      .createSignedUrls(list, expiresIn);
    // createSignedUrls keeps input order; drop any that failed to sign.
    return (data ?? [])
      .map((d) => d.signedUrl)
      .filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

/** Just the cover (first) photo as a signed URL, or null. */
export async function signUnitCover(
  admin: SupabaseClient,
  paths: string[] | null | undefined,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const first = (paths ?? []).filter(Boolean)[0];
  if (!first) return null;
  try {
    const { data } = await admin.storage
      .from(UNIT_PHOTO_BUCKET)
      .createSignedUrl(first, expiresIn);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
