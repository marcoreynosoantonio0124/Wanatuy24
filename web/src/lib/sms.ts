export type SmsResult = "sent" | "skipped" | "failed";

/** Convert an E.164 PH number (+639171234567) to Semaphore's local format. */
function toLocalPh(phone: string): string {
  if (phone.startsWith("+63")) return "0" + phone.slice(3);
  return phone.replace(/^\+/, "");
}

/**
 * Sends an SMS via Semaphore (https://semaphore.co) — a Philippine SMS gateway.
 * Returns "skipped" when SEMAPHORE_API_KEY is not set, so the app runs fine
 * without SMS until you fund and configure it.
 */
export async function sendSms(
  toE164: string,
  message: string,
): Promise<SmsResult> {
  const key = process.env.SEMAPHORE_API_KEY;
  if (!key) return "skipped";

  const params = new URLSearchParams();
  params.set("apikey", key);
  params.set("number", toLocalPh(toE164));
  params.set("message", message);
  const sender = process.env.SEMAPHORE_SENDER_NAME;
  if (sender) params.set("sendername", sender);

  try {
    const res = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

/** The four reminder touchpoints, in the order they fire over a month. */
export type ReminderKind = "before" | "due" | "after" | "weekly";

/**
 * Warm, personal Taglish reminders — written to feel like a real person, not a
 * promo blast (the sender name already shows "DUEMEET"). Each stays within one
 * SMS segment (≤160 chars) and the GSM-7 charset — no peso sign, emoji, or link,
 * which would force costly multi-part / Unicode messages.
 *
 * `amountPhp` is the amount still owed at send time, so partial months show the
 * remaining balance. `dueDateShort` is a short date like "Oct 1" (used by the
 * first, heads-up message).
 */
export function reminderSms(
  kind: ReminderKind,
  opts: { firstName: string; amountPhp: number; dueDateShort: string },
): string {
  const name = opts.firstName || "there";
  const pesos = (opts.amountPhp / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  switch (kind) {
    case "before":
      return `Hi ${name}, reminder po — 3 araw na lang bago ang due ng upa na PHP ${pesos} (${opts.dueDateShort}). Salamat at ingat po!`;
    case "due":
      return `Hi ${name}, ngayon na po ang araw ng due date ng upa na PHP ${pesos}. Pakibayad po kapag may pagkakataon. Salamat po!`;
    case "after":
      return `Hi ${name}, overdue na po tayo this month sa upa na PHP ${pesos}. Reminder lang po para ma-settle. Salamat sa pag-unawa!`;
    case "weekly":
      return `Hi ${name}, follow up lang po sa natitirang upa na PHP ${pesos}. Pakibayad po kapag kaya na. Salamat po!`;
  }
}

/** Short, human label for a reminder touchpoint (used in the record view). */
export function reminderKindLabel(kind: string): string {
  switch (kind) {
    case "before":
      return "3 days before";
    case "due":
      return "On due date";
    case "after":
      return "3 days after";
    case "weekly":
      return "Weekly follow-up";
    // legacy keys from the earlier schedule
    case "rent_due_soon":
      return "Before due date";
    case "rent_due_today":
      return "On due date";
    case "rent_overdue":
      return "After due date";
    case "manual_reminder":
      return "Manual reminder";
    default:
      return "Reminder";
  }
}
