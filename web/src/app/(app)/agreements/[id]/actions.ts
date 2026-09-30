"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { pesosToCentavos, formatPeso, formatDate } from "@/lib/format";
import { sendSms, reminderSms } from "@/lib/sms";
import { sendPush } from "@/lib/webpush";
import { sendEmail, reminderEmailHtml } from "@/lib/email";

function revalidate(agreementId: string) {
  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath("/dashboard");
}

export type ReminderResult = {
  ok?: boolean;
  channels?: string[];
  error?: string;
};

/**
 * One-click send: delivers a reminder to the renter right now through every
 * configured channel (SMS, push, email) — no share sheet, no app-picking.
 */
export async function sendReminderNow(
  _prev: ReminderResult,
  formData: FormData,
): Promise<ReminderResult> {
  const { user, supabase } = await requireUser();
  const periodId = String(formData.get("period_id"));
  const agreementId = String(formData.get("agreement_id"));

  // Ownership + data via the lessor's RLS-scoped client.
  const { data: ag } = await supabase
    .from("agreements")
    .select(
      "id, lessor_id, renter_name, renter_phone, renter_email, renter_access_token, payment_instructions, asset:assets(label)",
    )
    .eq("id", agreementId)
    .single();
  if (!ag || ag.lessor_id !== user.id) return { error: "Agreement not found." };

  const { data: period } = await supabase
    .from("periods")
    .select("id, due_date, amount_php")
    .eq("id", periodId)
    .single();
  if (!period) return { error: "Due date not found." };

  const agreement = ag as unknown as {
    renter_name: string;
    renter_phone: string | null;
    renter_email: string | null;
    renter_access_token: string;
    payment_instructions: string | null;
    asset: { label: string } | null;
  };

  const admin = createAdminClient();
  const base = process.env.APP_BASE_URL || "";
  const link = base ? `${base}/r/${agreement.renter_access_token}` : "";
  const firstName = agreement.renter_name.split(" ")[0] || "there";
  const amount = formatPeso(period.amount_php);
  const dueText = `due ${formatDate(period.due_date)}`;
  const unit = agreement.asset?.label ?? "your rental";
  const channels: string[] = [];

  // SMS
  if (agreement.renter_phone) {
    const r = await sendSms(
      agreement.renter_phone,
      reminderSms({ firstName, amountPhp: period.amount_php, dueText }),
    );
    if (r === "sent") {
      channels.push("SMS");
      // Log it so the Command Center counts manual sends toward SMS cost.
      const nowIso = new Date().toISOString();
      await admin.from("notifications").insert({
        agreement_id: agreementId,
        period_id: periodId,
        recipient: "renter",
        channel: "sms",
        template_key: "manual_reminder",
        scheduled_for: nowIso,
        status: "sent",
        sent_at: nowIso,
        dedupe_key: `manual:${periodId}:sms:${Date.now()}`,
      });
    }
  }

  // Push (to the renter's device subscriptions for this agreement)
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("agreement_id", agreementId);
  let pushed = false;
  for (const s of (subs ?? []) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[]) {
    const r = await sendPush(s, {
      title: "Rent reminder",
      body: `${amount} for ${unit} — ${dueText}.`,
      url: "/my-rentals",
    });
    if (r === "sent") pushed = true;
    if (r === "gone")
      await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
  }
  if (pushed) channels.push("push");

  // Email
  if (agreement.renter_email) {
    const r = await sendEmail(
      agreement.renter_email,
      "Rent reminder",
      reminderEmailHtml({
        heading: "Rent reminder",
        amount,
        unit,
        dueText,
        instructions: agreement.payment_instructions,
        link,
      }),
    );
    if (r === "sent") channels.push("email");
  }

  if (channels.length === 0) {
    return {
      error:
        "Walang naka-set up na channel. Turn on SMS (add a Semaphore key) or ask your renter to enable push reminders.",
    };
  }
  return { ok: true, channels };
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
 * Re-applies all recorded payments oldest-month-first and syncs each period's
 * lifecycle status: a fully-covered month becomes "paid"; a month that a
 * deletion just uncovered reverts to due/overdue/upcoming. Partially-paid and
 * waived months keep their existing status (the ledger shows the partial split).
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
      admin.from("payments").select("amount_php").eq("agreement_id", agreementId),
    ]);

  const grace = (ag as { grace_days?: number } | null)?.grace_days ?? 0;
  const periods = (periodsData ?? []) as {
    id: string;
    due_date: string;
    amount_php: number;
    status: string;
  }[];
  let pool = (paymentsData ?? []).reduce(
    (s, p) => s + ((p as { amount_php: number }).amount_php || 0),
    0,
  );
  const today = manilaTodayIso();

  for (const p of periods) {
    if (p.status === "waived") continue;
    const applied = Math.min(pool, p.amount_php);
    pool -= applied;
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

/** Records a payment the lessor received; it settles the oldest month first. */
export async function recordPayment(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const agreementId = String(formData.get("agreement_id"));
  const amountRaw = String(formData.get("amount") ?? "");

  const { data: ag } = await supabase
    .from("agreements")
    .select("id, lessor_id")
    .eq("id", agreementId)
    .single();
  if (!ag || (ag as { lessor_id: string }).lessor_id !== user.id) return;

  const centavos = pesosToCentavos(amountRaw);
  if (!Number.isFinite(centavos) || centavos <= 0) return;

  const admin = createAdminClient();
  await admin.from("payments").insert({
    agreement_id: agreementId,
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
