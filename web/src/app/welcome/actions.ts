"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Saves the role the user picked on the welcome screen and sends them to fill
 * in their profile. Uses the admin client so the write isn't blocked by RLS.
 */
export async function chooseRole(formData: FormData): Promise<void> {
  const { user } = await requireUser();
  const role = String(formData.get("role"));
  if (role !== "lessor" && role !== "tenant") return;

  const admin = createAdminClient();
  await admin.from("users").update({ role }).eq("id", user.id);

  redirect("/welcome/profile");
}

export type ProfileState = { error?: string };

const ID_BUCKET = "ids";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/**
 * Saves the signed-in user's profile record (name, address, birthdate, civil
 * status, suffix) plus a photo of their valid ID. Everyone — lessor or renter —
 * fills this once so there's a proper record for every account.
 */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { user, supabase } = await requireUser();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const suffix = String(formData.get("suffix") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const marital_status = String(formData.get("marital_status") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!full_name) return { error: "Please enter your full name." };
  if (!address) return { error: "Please enter your address." };
  if (!birthdate) return { error: "Please enter your birthdate." };
  if (!marital_status) return { error: "Please choose your civil status." };

  const admin = createAdminClient();

  // Does the user already have an ID on file?
  const { data: existing } = await admin
    .from("users")
    .select("valid_id_file_path")
    .eq("id", user.id)
    .single();
  let idPath = (existing as { valid_id_file_path?: string | null } | null)
    ?.valid_id_file_path ?? null;

  const file = formData.get("valid_id");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { error: "That file is larger than 10 MB." };
    if (!ALLOWED_TYPES.includes(file.type))
      return { error: "Upload a photo (PNG/JPG) or PDF of your ID." };
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `profile/${user.id}/valid-id-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(ID_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { error: `ID upload failed: ${upErr.message}` };
    idPath = path;
  }

  if (!idPath) return { error: "Please upload a photo of your valid ID." };

  const { error } = await admin
    .from("users")
    .update({
      full_name,
      suffix: suffix || null,
      address,
      birthdate,
      marital_status,
      phone: phone || null,
      valid_id_file_path: idPath,
      profile_completed: true,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  // Send them to the home that matches their role.
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (me as { role?: string | null } | null)?.role ?? null;
  redirect(role === "tenant" ? "/my-rentals" : "/dashboard");
}
