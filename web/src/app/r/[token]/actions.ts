"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { pesosToCentavos, ALL_PAYMENT_METHODS } from "@/lib/format";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { sendPush } from "@/lib/webpush";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const schema = z.object({
  token: z.string().min(10),
  period_id: z.string().uuid(),
  method: z.enum(ALL_PAYMENT_METHODS),
  amount: z.string().min(1),
  reference_no: z.string().trim().max(120).optional().or(z.literal("")),
  paid_on: z.string().min(1),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProofState = { error?: string; ok?: boolean };

const PROOF_BUCKET = "payment-proofs";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function submitProof(
  _prev: ProofState,
  formData: FormData,
): Promise<ProofState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    period_id: formData.get("period_id"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference_no: formData.get("reference_no") ?? "",
    paid_on: formData.get("paid_on"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const v = parsed.data;
  const admin = createAdminClient();

  // Authorize: the period must belong to the agreement holding this token.
  const { data: agreementData } = await admin
    .from("agreements")
    .select("id, lessor_id, lessor_phone, renter_name, asset:assets(label)")
    .eq("renter_access_token", v.token)
    .single();
  if (!agreementData) return { error: "This link is no longer valid." };
  const agreement = agreementData as unknown as {
    id: string;
    lessor_id: string;
    lessor_phone: string | null;
    renter_name: string;
    asset: { label: string } | null;
  };

  const { data: period } = await admin
    .from("periods")
    .select("id, agreement_id")
    .eq("id", v.period_id)
    .eq("agreement_id", agreement.id)
    .single();
  if (!period) return { error: "That due date wasn't found." };

  // Optional receipt upload to private Storage.
  let filePath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: "That file is larger than 10 MB." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: "Upload a PNG, JPG, WebP, or PDF." };
    }
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${agreement.id}/${v.period_id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(PROOF_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };
    filePath = path;
  }

  const { error } = await admin.from("payment_proofs").insert({
    period_id: v.period_id,
    submitted_by: "renter",
    method: v.method,
    reference_no: v.reference_no || null,
    amount_php: pesosToCentavos(v.amount),
    paid_on: v.paid_on,
    file_path: filePath,
    note: v.note || null,
    status: "pending",
  });
  if (error) return { error: error.message };

  await admin
    .from("periods")
    .update({ status: "proof_submitted" })
    .eq("id", v.period_id)
    .in("status", ["upcoming", "due", "overdue"]);

  // Best-effort: alert the lessor that a proof arrived (email + SMS + push).
  try {
    const who = agreement.renter_name || "Your tenant";
    const unit = agreement.asset?.label ?? "your unit";
    const base = process.env.APP_BASE_URL || "";
    const link = base ? `${base}/agreements/${agreement.id}` : "";

    const { data: lessor } = await admin
      .from("users")
      .select("email")
      .eq("id", agreement.lessor_id)
      .single();
    const lessorEmail = (lessor as { email?: string } | null)?.email;
    if (lessorEmail) {
      await sendEmail(
        lessorEmail,
        "📩 New proof of payment",
        `<div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
          <p style="color:#059669;font-weight:700;margin:0 0 8px">DueMeet</p>
          <p><strong>${esc(who)}</strong> just sent proof of payment for <strong>${esc(unit)}</strong>.</p>
          <p style="color:#475569">Open DueMeet to view it and record the amount you received.</p>
          ${link ? `<p style="margin:20px 0"><a href="${link}" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review it</a></p>` : ""}
        </div>`,
      );
    }
    if (agreement.lessor_phone) {
      await sendSms(
        agreement.lessor_phone,
        `DueMeet: ${who} sent proof of payment. Pakicheck po sa app.`,
      );
    }
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", agreement.lessor_id);
    for (const s of (subs ?? []) as {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[]) {
      await sendPush(s, {
        title: "New proof of payment",
        body: `${who} sent proof for ${unit}.`,
        url: `/agreements/${agreement.id}`,
      });
    }
  } catch {
    // Alerts are best-effort; never fail the tenant's submission over them.
  }

  revalidatePath(`/r/${v.token}`);
  return { ok: true };
}

// ---- Renter → lessor messages ("Message the owner") ----------------------

const messageSchema = z.object({
  token: z.string().min(10),
  period_id: z.string().uuid(),
  body: z.string().trim().min(1, "Type a message first.").max(1000),
});

export type MessageState = { error?: string; ok?: boolean };

export async function sendRenterMessage(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  const parsed = messageSchema.safeParse({
    token: formData.get("token"),
    period_id: formData.get("period_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }
  const v = parsed.data;
  const admin = createAdminClient();

  const { data: agreementData } = await admin
    .from("agreements")
    .select("id, lessor_id, lessor_phone, renter_name, asset:assets(label)")
    .eq("renter_access_token", v.token)
    .single();
  if (!agreementData) return { error: "This link is no longer valid." };
  const agreement = agreementData as unknown as {
    id: string;
    lessor_id: string;
    lessor_phone: string | null;
    renter_name: string;
    asset: { label: string } | null;
  };

  const { data: period } = await admin
    .from("periods")
    .select("id, agreement_id")
    .eq("id", v.period_id)
    .eq("agreement_id", agreement.id)
    .single();
  if (!period) return { error: "That due date wasn't found." };

  const { error } = await admin.from("messages").insert({
    agreement_id: agreement.id,
    period_id: v.period_id,
    sender: "renter",
    body: v.body,
  });
  if (error) return { error: error.message };

  // Best-effort: alert the lessor that a message arrived.
  try {
    const who = agreement.renter_name || "Your tenant";
    const unit = agreement.asset?.label ?? "your unit";
    const base = process.env.APP_BASE_URL || "";
    const link = base ? `${base}/agreements/${agreement.id}` : "";

    const { data: lessor } = await admin
      .from("users")
      .select("email")
      .eq("id", agreement.lessor_id)
      .single();
    const lessorEmail = (lessor as { email?: string } | null)?.email;
    if (lessorEmail) {
      await sendEmail(
        lessorEmail,
        "💬 New message from your tenant",
        `<div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
          <p style="color:#059669;font-weight:700;margin:0 0 8px">DueMeet</p>
          <p><strong>${esc(who)}</strong> sent you a message about <strong>${esc(unit)}</strong>:</p>
          <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:4px 12px;color:#475569">${esc(v.body)}</blockquote>
          ${link ? `<p style="margin:20px 0"><a href="${link}" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open DueMeet</a></p>` : ""}
        </div>`,
      );
    }
    if (agreement.lessor_phone) {
      await sendSms(
        agreement.lessor_phone,
        `DueMeet: ${who} sent you a message. Pakicheck po sa app.`,
      );
    }
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", agreement.lessor_id);
    for (const s of (subs ?? []) as {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[]) {
      await sendPush(s, {
        title: "New message from your tenant",
        body: `${who}: ${v.body.slice(0, 80)}`,
        url: `/agreements/${agreement.id}`,
      });
    }
  } catch {
    // Alerts are best-effort; never fail the tenant's message over them.
  }

  revalidatePath(`/r/${v.token}`);
  return { ok: true };
}

const ID_BUCKET = "ids";

export type RenterIdState = { error?: string; ok?: boolean };

/** Renter uploads a photo of their ID (verification). Kept private, keyed by
 * the agreement so it works for renters who have no account. */
export async function uploadRenterId(
  _prev: RenterIdState,
  formData: FormData,
): Promise<RenterIdState> {
  const token = String(formData.get("token") ?? "");
  const file = formData.get("file");
  if (token.length < 10) return { error: "This link is no longer valid." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a photo of your ID." };
  }
  if (file.size > MAX_FILE_BYTES || !ALLOWED_TYPES.includes(file.type)) {
    return { error: "Use a photo or PDF up to 10 MB." };
  }

  const admin = createAdminClient();
  const { data: ag } = await admin
    .from("agreements")
    .select("id")
    .eq("renter_access_token", token)
    .single();
  if (!ag) return { error: "This link is no longer valid." };
  const agreementId = (ag as { id: string }).id;

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${agreementId}/renter-id-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(ID_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { error: "Upload failed. Please try again." };

  await admin
    .from("agreements")
    .update({ renter_id_file_path: path })
    .eq("id", agreementId);

  revalidatePath(`/r/${token}`);
  revalidatePath("/my-rentals");
  return { ok: true };
}
