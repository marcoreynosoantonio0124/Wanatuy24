"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { classifyId } from "@/lib/id-check";

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
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/** Normalise a PH mobile number to E.164 (+639171234567). null when blank. */
function toPhE164(raw: string): { ok: true; value: string | null } | { ok: false } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const d = t.replace(/[^\d+]/g, "");
  let e: string | null = null;
  if (/^\+63\d{10}$/.test(d)) e = d;
  else if (/^63\d{10}$/.test(d)) e = "+" + d;
  else if (/^0\d{10}$/.test(d)) e = "+63" + d.slice(1);
  else if (/^9\d{9}$/.test(d)) e = "+63" + d;
  return e ? { ok: true, value: e } : { ok: false };
}

/** Empty → null; anything else (including "N/A") is kept verbatim. */
function textOrNull(raw: FormDataEntryValue | null): string | null {
  const t = String(raw ?? "").trim();
  return t ? t : null;
}

type ParsedProfile = {
  full_name: string;
  suffix: string | null;
  address: string;
  birthdate: string;
  marital_status: string;
  phone: string | null;
  occupation: string | null;
  employer: string | null;
  work_address: string | null;
  spouse_name: string | null;
  children_count: number | null;
};

/** Reads + validates the shared profile fields. Returns an error string or the parsed record. */
function parseProfile(formData: FormData): { error: string } | { value: ParsedProfile } {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const marital_status = String(formData.get("marital_status") ?? "").trim();

  if (!full_name) return { error: "Please enter your full name." };
  if (!address) return { error: "Please enter your address." };
  if (!birthdate) return { error: "Please enter your birthdate." };
  if (!marital_status) return { error: "Please choose your civil status." };

  const phoneParsed = toPhE164(String(formData.get("phone") ?? ""));
  if (!phoneParsed.ok) {
    return { error: "Enter a valid PH mobile number, e.g. 0917 123 4567 — or leave it blank." };
  }

  const childrenRaw = String(formData.get("children_count") ?? "").trim();
  let children_count: number | null = null;
  if (childrenRaw && childrenRaw.toUpperCase() !== "N/A") {
    const n = parseInt(childrenRaw.replace(/\D/g, ""), 10);
    children_count = Number.isFinite(n) ? n : null;
  }

  return {
    value: {
      full_name,
      suffix: textOrNull(formData.get("suffix")),
      address,
      birthdate,
      marital_status,
      phone: phoneParsed.value,
      occupation: textOrNull(formData.get("occupation")),
      employer: textOrNull(formData.get("employer")),
      work_address: textOrNull(formData.get("work_address")),
      spouse_name: textOrNull(formData.get("spouse_name")),
      children_count,
    },
  };
}

/** Uploads a new valid-ID file if one was provided; returns the stored path (or the existing one). */
async function handleIdUpload(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  file: FormDataEntryValue | null,
): Promise<{ error: string } | { path: string | null; idUpdate: Record<string, unknown> }> {
  const { data: existing } = await admin
    .from("users")
    .select("valid_id_file_path")
    .eq("id", userId)
    .single();
  let idPath =
    (existing as { valid_id_file_path?: string | null } | null)?.valid_id_file_path ?? null;
  // Only touch the verdict columns when a new file is actually processed.
  let idUpdate: Record<string, unknown> = {};

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { error: "That file is larger than 20 MB." };
    if (!ALLOWED_TYPES.includes(file.type))
      return { error: "Upload a photo (PNG/JPG) or PDF of your ID." };

    // Classify BEFORE storing so a rejected image is never kept.
    const bytes = Buffer.from(await file.arrayBuffer());
    const verdict = await classifyId(bytes, file.type);
    if (verdict) {
      if (!verdict.looks_like_id)
        return {
          error:
            "That photo doesn't look like an ID. Please upload a valid ID — or leave it blank to continue without one.",
        };
      if (!verdict.is_clear)
        return {
          error:
            "We couldn't clearly read the name and photo. Please upload a clearer photo of your ID.",
        };
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `profile/${userId}/valid-id-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(ID_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) return { error: `ID upload failed: ${upErr.message}` };
    idPath = path;
    // Badge only for a confirmed government ID. If the AI is off/unreachable
    // (verdict null), store the ID but leave it unverified (no badge).
    idUpdate = {
      id_verified: verdict ? verdict.is_government_id : false,
      id_doc_type: verdict ? verdict.id_type : null,
    };
  }
  return { path: idPath, idUpdate };
}

/**
 * Saves the signed-in user's one-time profile record — the basic details plus
 * livelihood, family, an optional mobile number and an optional photo of a valid
 * ID. Phone + ID are optional: without both, the account just doesn't earn the
 * Verified badge yet. Used for the first-time sign-up (redirects to the home
 * that matches their role).
 */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { user, supabase } = await requireUser();

  const parsed = parseProfile(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const id = await handleIdUpload(admin, user.id, formData.get("valid_id"));
  if ("error" in id) return id;

  const { error } = await admin
    .from("users")
    .update({
      ...parsed.value,
      valid_id_file_path: id.path,
      ...id.idUpdate,
      profile_completed: true,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (me as { role?: string | null } | null)?.role ?? null;
  redirect(role === "tenant" ? "/my-rentals" : "/dashboard");
}

/**
 * Updates the profile from the "Edit profile" page and returns to the profile
 * view. Same fields as sign-up; all editable anytime.
 */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { user } = await requireUser();

  const parsed = parseProfile(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const id = await handleIdUpload(admin, user.id, formData.get("valid_id"));
  if ("error" in id) return id;

  const { error } = await admin
    .from("users")
    .update({
      ...parsed.value,
      valid_id_file_path: id.path,
      ...id.idUpdate,
      profile_completed: true,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  redirect("/profile");
}
