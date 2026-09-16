/** Central env config (spec A11 defaults). Read once, typed. */

export const config = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  publicSignup: (process.env.PUBLIC_SIGNUP ?? "false") === "true",
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? "Asia/Dubai",
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? "AED",
  emailFrom: process.env.EMAIL_FROM ?? "DueMate <no-reply@example.com>",
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10),
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
      }
    : undefined,
  smsEnabled: (process.env.SMS_ENABLED ?? "false") === "true",
  auditRetentionYears: parseInt(process.env.AUDIT_RETENTION_YEARS ?? "7", 10),
};

/** Format an amount + currency for display/templates. Money is Decimal in DB. */
export function formatMoney(amount: string | number | null | undefined, currency: string): string | null {
  if (amount === null || amount === undefined) return null;
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-AE", { style: "currency", currency }).format(n);
}
