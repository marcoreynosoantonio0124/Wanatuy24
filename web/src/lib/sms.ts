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

/**
 * Short Taglish reminder kept to a single SMS segment (≤160 chars) and to the
 * GSM-7 charset — no peso sign, emoji, or link, which would force costly
 * multi-part / Unicode messages. (The full link still rides push/email.)
 */
export function reminderSms(opts: {
  firstName: string;
  amountPhp: number;
  dueText: string;
}): string {
  const pesos = (opts.amountPhp / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return `DueMeet: Hi ${opts.firstName}, PHP ${pesos} na upa, ${opts.dueText}. Pakibayad po. Salamat!`;
}
