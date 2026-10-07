"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

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
