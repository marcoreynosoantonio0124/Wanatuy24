"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

const UNIT_PHOTO_BUCKET = "unit-photos";
const MAX_UNIT_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const schema = z.object({
  type: z.enum([
    "house",
    "room",
    "apartment",
    "car",
    "motorcycle",
    "commercial",
    "other",
  ]),
  label: z.string().trim().min(1, "Label is required.").max(120),
  address_text: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
});

function toCoord(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type AssetFormState = { error?: string };

export async function createAsset(
  _prev: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const { user, supabase } = await requireUser();

  const parsed = schema.safeParse({
    type: formData.get("type"),
    label: formData.get("label"),
    address_text: formData.get("address_text") ?? "",
    notes: formData.get("notes") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { type, label, address_text, notes, latitude, longitude } = parsed.data;
  const { error } = await supabase.from("assets").insert({
    lessor_id: user.id,
    type,
    label,
    address_text: address_text || null,
    notes: notes || null,
    latitude: toCoord(latitude),
    longitude: toCoord(longitude),
  });

  if (error) return { error: error.message };
  revalidatePath("/assets");
  return {};
}

/**
 * "Delete" a unit — a soft archive, so its past agreements stay intact in the
 * History page. Refused while the unit still has an active agreement (end the
 * contract first). RLS scopes the update to the lessor's own asset.
 */
export async function archiveAsset(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = String(formData.get("asset_id") ?? "");
  if (!id) return;

  const { data: active } = await supabase
    .from("agreements")
    .select("id")
    .eq("asset_id", id)
    .eq("status", "active")
    .limit(1);
  if (active && active.length > 0) return; // occupied — can't delete

  await supabase
    .from("assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath("/assets");
}

export type PhotoFormState = { error?: string; ok?: boolean };

/**
 * Adds one or more photos to a unit (optional, up to MAX_UNIT_PHOTOS total).
 * The first photo in the stored order is the cover. Stored in a private bucket;
 * the app serves them through short-lived signed URLs. RLS scopes the read of
 * the current paths to the owning lessor; the admin client does the upload +
 * column write (storage has no per-row policy).
 */
export async function addUnitPhotos(
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const { user, supabase } = await requireUser();
  const assetId = String(formData.get("asset_id") ?? "");
  if (!assetId) return { error: "Missing unit." };

  // Ownership + current photos (RLS scopes this to the lessor's own asset).
  const { data: assetRow } = await supabase
    .from("assets")
    .select("id, photo_paths")
    .eq("id", assetId)
    .maybeSingle();
  if (!assetRow) return { error: "Unit not found." };
  const current = ((assetRow as { photo_paths: string[] | null }).photo_paths ?? []);

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };

  const room = MAX_UNIT_PHOTOS - current.length;
  if (room <= 0)
    return { error: `You can keep up to ${MAX_UNIT_PHOTOS} photos. Remove one first.` };
  if (files.length > room)
    return {
      error:
        room === 1
          ? "There's room for just 1 more photo."
          : `There's room for ${room} more photos.`,
    };

  const admin = createAdminClient();
  const added: string[] = [];
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES)
      return { error: "Each photo must be under 10 MB." };
    if (!PHOTO_TYPES.includes(file.type))
      return { error: "Photos must be PNG, JPG, or WebP." };
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${assetId}/${Date.now()}-${added.length}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(UNIT_PHOTO_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { error: `Upload failed: ${upErr.message}` };
    added.push(path);
  }

  const { error } = await admin
    .from("assets")
    .update({ photo_paths: [...current, ...added] })
    .eq("id", assetId);
  if (error) return { error: error.message };

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Removes one photo from a unit (by its stored path) and deletes the file.
 * If the cover (first) is removed, the next photo becomes the cover.
 */
export async function removeUnitPhoto(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const assetId = String(formData.get("asset_id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!assetId || !path) return;

  const { data: assetRow } = await supabase
    .from("assets")
    .select("id, photo_paths")
    .eq("id", assetId)
    .maybeSingle();
  if (!assetRow) return;
  const current = ((assetRow as { photo_paths: string[] | null }).photo_paths ?? []);
  if (!current.includes(path)) return;

  const admin = createAdminClient();
  await admin.storage.from(UNIT_PHOTO_BUCKET).remove([path]);
  await admin
    .from("assets")
    .update({ photo_paths: current.filter((p) => p !== path) })
    .eq("id", assetId);

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}
