export type EmailResult = "sent" | "skipped" | "failed";

/**
 * Sends a transactional email via Resend (https://resend.com).
 * Returns "skipped" when RESEND_API_KEY / EMAIL_FROM are not configured, so the
 * app runs fine without email until you wire a provider.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return "skipped";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

/** Minimal branded HTML wrapper for reminder emails. */
export function reminderEmailHtml(opts: {
  heading: string;
  amount: string;
  unit: string;
  dueText: string;
  instructions?: string | null;
  link?: string;
}): string {
  const instr = opts.instructions
    ? `<p style="margin:16px 0;padding:12px;background:#ecfdf5;border-radius:8px;color:#065f46;white-space:pre-wrap">${escapeHtml(
        opts.instructions,
      )}</p>`
    : "";
  const cta = opts.link
    ? `<p style="margin:20px 0"><a href="${opts.link}" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View & pay</a></p>`
    : "";
  return `<div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <p style="color:#059669;font-weight:700;margin:0 0 8px">DueMeet</p>
    <h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(opts.heading)}</h1>
    <p style="color:#475569;margin:0">${escapeHtml(opts.unit)} — ${escapeHtml(
      opts.dueText,
    )}</p>
    <p style="font-size:28px;font-weight:700;margin:16px 0">${escapeHtml(
      opts.amount,
    )}</p>
    ${instr}${cta}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">You're receiving this because your rental is tracked on DueMeet.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
