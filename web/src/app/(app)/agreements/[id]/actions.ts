"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { pesosToCentavos } from "@/lib/format";
import { sendEmail } from "@/lib/email";
import { sendPush } from "@/lib/webpush";

function revalidate(agreementId: string) {
  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/dashboard");
}

export async function markPeriodPaid(formData: FormData) {
  const { user, supabase } = await requireUser();
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));

  await supabase
    .from("periods")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", periodId);
  revalidate(agreementId);
}

export async function waivePeriod(formData: FormData) {
  const { supabase } = await requireUser();
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));

  await supabase.from("periods").update({ status: "waived" }).eq("id", periodId);
  revalidate(agreementId);
}

export async function reviewProof(formData: FormData) {
  const { user, supabase } = await requireUser();
  const proofId = String(formData.get("proof_id"));
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));
  const decision = String(formData.get("decision")); // "accepted" | "rejected"

  if (decision !== "accepted" && decision !== "rejected") return;

  await supabase
    .from("payment_proofs")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      rejection_reason:
        decision === "rejected"
          ? String(formData.get("rejection_reason") ?? "") || null
          : null,
    })
    .eq("id", proofId);

  if (decision === "accepted") {
    await supabase
      .from("periods")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", periodId);
  } else {
    // Send it back to due/overdue based on the date.
    await supabase
      .from("periods")
      .update({ status: "due" })
      .eq("id", periodId)
      .eq("status", "proof_submitted");
  }
  revalidate(agreementId);
}

const chargeSchema = z.object({
  agreement_id: z.string().uuid(),
  period_id: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().min(1).max(120),
  amount: z.string().min(1),
});

export async function addCharge(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const parsed = chargeSchema.safeParse({
    agreement_id: formData.get("agreement_id"),
    period_id: formData.get("period_id") ?? "",
    label: formData.get("label"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return;

  const v = parsed.data;
  await supabase.from("charges").insert({
    agreement_id: v.agreement_id,
    period_id: v.period_id || null,
    label: v.label,
    amount_php: pesosToCentavos(v.amount),
    created_by: user.id,
  });
  revalidate(v.agreement_id);
}

// ---- Payments ledger -------------------------------------------------------

function manilaTodayIso(): string {
  const manila = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 10);
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Recomputes each period's status from the payments recorded **against that
 * month** (period_id). A fully-covered month becomes "paid"; a month a deletion
 * just uncovered reverts to due/overdue/upcoming. Partial and waived months keep
 * their status (the ledger shows the split). Legacy payments with no period_id
 * are applied oldest-first as a fallback.
 */
async function resyncAgreement(admin: Admin, agreementId: string): Promise<void> {
  const [{ data: ag }, { data: periodsData }, { data: paymentsData }] =
    await Promise.all([
      admin.from("agreements").select("grace_days").eq("id", agreementId).single(),
      admin
        .from("periods")
        .select("id, due_date, amount_php, status")
        .eq("agreement_id", agreementId)
        .order("due_date", { ascending: true }),
      admin
        .from("payments")
        .select("period_id, amount_php")
        .eq("agreement_id", agreementId),
    ]);

  const grace = (ag as { grace_days?: number } | null)?.grace_days ?? 0;
  const periods = (periodsData ?? []) as {
    id: string;
    due_date: string;
    amount_php: number;
    status: string;
  }[];

  const assigned = new Map<string, number>();
  let pool = 0;
  for (const raw of paymentsData ?? []) {
    const p = raw as { period_id: string | null; amount_php: number };
    const amt = p.amount_php || 0;
    if (p.period_id) assigned.set(p.period_id, (assigned.get(p.period_id) ?? 0) + amt);
    else pool += amt;
  }
  const today = manilaTodayIso();

  for (const p of periods) {
    if (p.status === "waived") continue;
    let applied = assigned.get(p.id) ?? 0;
    if (pool > 0 && applied < p.amount_php) {
      const add = Math.min(pool, p.amount_php - applied);
      applied += add;
      pool -= add;
    }
    const fullyPaid = applied >= p.amount_php;

    if (fullyPaid && p.status !== "paid") {
      await admin
        .from("periods")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", p.id);
    } else if (!fullyPaid && p.status === "paid") {
      const graceDate = new Date(
        new Date(`${p.due_date}T00:00:00+08:00`).getTime() +
          grace * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      const reverted =
        graceDate < today ? "overdue" : p.due_date <= today ? "due" : "upcoming";
      await admin
        .from("periods")
        .update({ status: reverted, paid_at: null })
        .eq("id", p.id);
    }
  }
}

/** Records a payment against a specific month (period_id) — no spillover. */
export async function recordPayment(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const agreementId = String(formData.get("agreement_id"));
  const periodId = String(formData.get("period_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");

  const { data: ag } = await supabase
    .from("agreements")
    .select("id, lessor_id")
    .eq("id", agreementId)
    .single();
  if (!ag || (ag as { lessor_id: string }).lessor_id !== user.id) return;
  if (!periodId) return;

  const centavos = pesosToCentavos(amountRaw);
  if (!Number.isFinite(centavos) || centavos <= 0) return;

  const admin = createAdminClient();
  await admin.from("payments").insert({
    agreement_id: agreementId,
    period_id: periodId,
    amount_php: centavos,
    recorded_by: user.id,
  });
  await resyncAgreement(admin, agreementId);
  revalidate(agreementId);
}

/** Removes a mistaken payment entry and recomputes the ledger. */
export async function deletePayment(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const paymentId = String(formData.get("payment_id"));
  const agreementId = String(formData.get("agreement_id"));

  const { data: ag } = await supabase
    .from("agreements")
    .select("lessor_id")
    .eq("id", agreementId)
    .single();
  if (!ag || (ag as { lessor_id: string }).lessor_id !== user.id) return;

  const admin = createAdminClient();
  await admin
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("agreement_id", agreementId);
  await resyncAgreement(admin, agreementId);
  revalidate(agreementId);
}

/** Marks a tenant's proof as seen so its badge stops blinking. */
export async function markProofSeen(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const proofId = String(formData.get("proof_id"));
  const agreementId = String(formData.get("agreement_id"));

  const { data: ag } = await supabase
    .from("agreements")
    .select("lessor_id")
    .eq("id", agreementId)
    .single();
  if (!ag || (ag as { lessor_id: string }).lessor_id !== user.id) return;

  const admin = createAdminClient();
  await admin
    .from("payment_proofs")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", proofId)
    .is("seen_at", null);
  revalidate(agreementId);
}

// ---- Contract attachment ---------------------------------------------------

const CONTRACT_BUCKET = "contracts";
const CONTRACT_MAX_BYTES = 20 * 1024 * 1024;
const CONTRACT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export type ContractState = { error?: string; ok?: boolean };

/** Uploads (or replaces) the signed contract file for an agreement. */
export async function uploadContract(
  _prev: ContractState,
  formData: FormData,
): Promise<ContractState> {
  const { user, supabase } = await requireUser();
  const agreementId = String(formData.get("agreement_id"));

  const { data: ag } = await supabase
    .from("agreements")
    .select("id, lessor_id, contract_file_path")
    .eq("id", agreementId)
    .single();
  const owned = ag as { lessor_id: string; contract_file_path: string | null } | null;
  if (!owned || owned.lessor_id !== user.id) {
    return { error: "Agreement not found." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > CONTRACT_MAX_BYTES) {
    return { error: "That file is larger than 20 MB." };
  }
  if (!CONTRACT_TYPES.includes(file.type)) {
    return { error: "Upload a PDF, PNG, JPG, or WebP." };
  }

  const admin = createAdminClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${agreementId}/contract-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(CONTRACT_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  await admin
    .from("agreements")
    .update({ contract_file_path: path })
    .eq("id", agreementId);

  // Best-effort: remove the previous file so the vault doesn't accumulate.
  if (owned.contract_file_path && owned.contract_file_path !== path) {
    await admin.storage.from(CONTRACT_BUCKET).remove([owned.contract_file_path]);
  }

  revalidate(agreementId);
  revalidatePath("/contracts");
  return { ok: true };
}

/** Removes the attached contract from an agreement. */
export async function removeContract(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const agreementId = String(formData.get("agreement_id"));

  const { data: ag } = await supabase
    .from("agreements")
    .select("lessor_id, contract_file_path")
    .eq("id", agreementId)
    .single();
  const owned = ag as { lessor_id: string; contract_file_path: string | null } | null;
  if (!owned || owned.lessor_id !== user.id) return;

  const admin = createAdminClient();
  if (owned.contract_file_path) {
    await admin.storage.from(CONTRACT_BUCKET).remove([owned.contract_file_path]);
  }
  await admin
    .from("agreements")
    .update({ contract_file_path: null })
    .eq("id", agreementId);

  revalidate(agreementId);
  revalidatePath("/contracts");
}

// ---- Lessor → renter messages (reply to "Message the owner") ---------------

export type ReplyState = { error?: string; ok?: boolean };

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendLessorMessage(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const { user, supabase } = await requireUser();
  const agreementId = String(formData.get("agreement_id") ?? "");
  const periodId = String(formData.get("period_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Type a message first." };
  if (body.length > 1000) return { error: "That message is too long." };
  if (!periodId) return { error: "Missing month." };

  const { data: agData } = await supabase
    .from("agreements")
    .select("id, lessor_id, renter_user_id, renter_name, asset:assets(label)")
    .eq("id", agreementId)
    .single();
  const ag = agData as unknown as {
    id: string;
    lessor_id: string;
    renter_user_id: string | null;
    renter_name: string;
    asset: { label: string } | null;
  } | null;
  if (!ag || ag.lessor_id !== user.id) return { error: "Not allowed." };

  const admin = createAdminClient();
  const { error } = await admin.from("messages").insert({
    agreement_id: agreementId,
    period_id: periodId,
    sender: "lessor",
    body,
  });
  if (error) return { error: error.message };

  // Best-effort: notify the renter if they have an account.
  try {
    if (ag.renter_user_id) {
      const unit = ag.asset?.label ?? "your rental";
      const base = process.env.APP_BASE_URL || "";
      const link = base ? `${base}/my-rentals/${agreementId}` : "";
      const { data: renter } = await admin
        .from("users")
        .select("email")
        .eq("id", ag.renter_user_id)
        .single();
      const renterEmail = (renter as { email?: string } | null)?.email;
      if (renterEmail) {
        await sendEmail(
          renterEmail,
          "💬 Message from your landlord",
          `<div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
            <p style="color:#059669;font-weight:700;margin:0 0 8px">DueMeet</p>
            <p>Your landlord sent you a message about <strong>${escHtml(unit)}</strong>:</p>
            <blockquote style="border-left:3px solid #e2e8f0;margin:12px 0;padding:4px 12px;color:#475569">${escHtml(body)}</blockquote>
            ${link ? `<p style="margin:20px 0"><a href="${link}" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open DueMeet</a></p>` : ""}
          </div>`,
        );
      }
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", ag.renter_user_id);
      for (const s of (subs ?? []) as {
        endpoint: string;
        p256dh: string;
        auth: string;
      }[]) {
        await sendPush(s, {
          title: "Message from your landlord",
          body: body.slice(0, 80),
          url: `/my-rentals/${agreementId}`,
        });
      }
    }
  } catch {
    // Notifications are best-effort.
  }

  revalidatePath(`/dashboard/unit/${agreementId}`);
  revalidatePath(`/my-rentals/${agreementId}`);
  return { ok: true };
}
