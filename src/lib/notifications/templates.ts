import { DateTime } from "luxon";

/**
 * Keyed notification templates (spec §5.2). Each has email (subject + HTML +
 * text) and a ≤160-char SMS variant. Tone: neutral and factual, never
 * passive-aggressive — the product removes emotion from this conversation.
 *
 * Every reminder includes: what, how much, due when (in agreement TZ), asset
 * label, a deep link, and a one-line "already paid? upload proof" CTA.
 */

export type TemplateKey =
  | "reminder.upcoming"
  | "reminder.due"
  | "reminder.overdue"
  | "proof.submitted"
  | "proof.accepted"
  | "proof.rejected"
  | "invite.renter"
  | "escalation.lessor";

export interface TemplateContext {
  obligationTitle: string;
  assetLabel: string;
  amount?: string | null; // preformatted, e.g. "AED 5,000.00"
  currency?: string;
  dueAt: Date;
  timezone: string;
  url: string; // deep link to the occurrence
  renterName?: string;
  lessorName?: string;
  reviewNote?: string;
  inviteUrl?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
  sms: string; // ≤160 chars
}

function fmtDue(dueAt: Date, timezone: string): string {
  return DateTime.fromJSDate(dueAt, { zone: timezone }).toFormat("ccc d LLL yyyy, HH:mm ZZZZ");
}

function money(ctx: TemplateContext): string {
  return ctx.amount ? ctx.amount : "";
}

function amountLine(ctx: TemplateContext): string {
  return ctx.amount ? ` for ${ctx.amount}` : "";
}

const CTA = "Already handled it? Upload your proof here";

function wrapHtml(title: string, bodyLines: string[], ctx: TemplateContext): string {
  const rows = bodyLines.map((l) => `<p style="margin:0 0 12px">${l}</p>`).join("");
  return `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111;line-height:1.5;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px;font-size:18px">${title}</h2>
  ${rows}
  <p style="margin:24px 0 0"><a href="${ctx.url}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Open in DueMate</a></p>
  <p style="margin:16px 0 0;font-size:13px;color:#555">${CTA}: <a href="${ctx.url}">${ctx.url}</a></p>
  </body></html>`;
}

/** ≤160 char SMS builder — truncates defensively. */
function sms(body: string): string {
  return body.length <= 160 ? body : body.slice(0, 157) + "...";
}

export function renderTemplate(key: TemplateKey, ctx: TemplateContext): RenderedTemplate {
  const due = fmtDue(ctx.dueAt, ctx.timezone);
  const asset = ctx.assetLabel;
  const what = ctx.obligationTitle;

  switch (key) {
    case "reminder.upcoming": {
      const subject = `Upcoming: ${what} — due ${due}`;
      const lines = [
        `This is a reminder that <b>${what}</b>${amountLine(ctx)} for <b>${asset}</b> is due on <b>${due}</b>.`,
        `No action is needed yet — this is a heads-up.`,
      ];
      return {
        subject,
        html: wrapHtml("Upcoming reminder", lines, ctx),
        text: `Reminder: ${what}${amountLine(ctx)} for ${asset} is due ${due}. ${CTA}: ${ctx.url}`,
        sms: sms(`DueMate: ${what}${amountLine(ctx)} for ${asset} due ${due}. ${ctx.url}`),
      };
    }
    case "reminder.due": {
      const subject = `Due today: ${what}${amountLine(ctx)}`;
      const lines = [
        `<b>${what}</b>${amountLine(ctx)} for <b>${asset}</b> is due today (${due}).`,
        `When it's done, upload your proof so both sides are in sync.`,
      ];
      return {
        subject,
        html: wrapHtml("Due today", lines, ctx),
        text: `Due today: ${what}${amountLine(ctx)} for ${asset} (${due}). ${CTA}: ${ctx.url}`,
        sms: sms(`DueMate: ${what}${amountLine(ctx)} for ${asset} due today. Upload proof: ${ctx.url}`),
      };
    }
    case "reminder.overdue": {
      const subject = `Overdue: ${what}${amountLine(ctx)}`;
      const lines = [
        `<b>${what}</b>${amountLine(ctx)} for <b>${asset}</b> was due on <b>${due}</b> and hasn't been confirmed yet.`,
        `If you've already handled it, upload your proof to close it out.`,
      ];
      return {
        subject,
        html: wrapHtml("Overdue", lines, ctx),
        text: `Overdue: ${what}${amountLine(ctx)} for ${asset}, due ${due}. ${CTA}: ${ctx.url}`,
        sms: sms(`DueMate: ${what}${amountLine(ctx)} for ${asset} is overdue (${due}). ${ctx.url}`),
      };
    }
    case "proof.submitted": {
      const subject = `Proof submitted: ${what}`;
      const lines = [
        `${ctx.renterName ?? "The responsible party"} submitted proof for <b>${what}</b>${amountLine(ctx)} on <b>${asset}</b>.`,
        `Review and confirm or reject it.`,
      ];
      return {
        subject,
        html: wrapHtml("Proof awaiting review", lines, ctx),
        text: `Proof submitted for ${what} (${asset}). Review: ${ctx.url}`,
        sms: sms(`DueMate: proof submitted for ${what} (${asset}). Review: ${ctx.url}`),
      };
    }
    case "proof.accepted": {
      const subject = `Confirmed: ${what}`;
      const lines = [
        `Your proof for <b>${what}</b>${amountLine(ctx)} on <b>${asset}</b> was confirmed. Nothing further is needed.`,
      ];
      return {
        subject,
        html: wrapHtml("Confirmed", lines, ctx),
        text: `Confirmed: ${what} (${asset}). ${ctx.url}`,
        sms: sms(`DueMate: ${what} (${asset}) confirmed. ${ctx.url}`),
      };
    }
    case "proof.rejected": {
      const subject = `Needs another look: ${what}`;
      const note = ctx.reviewNote ? ` Reason: ${ctx.reviewNote}` : "";
      const lines = [
        `Your proof for <b>${what}</b>${amountLine(ctx)} on <b>${asset}</b> wasn't accepted.${note}`,
        `Please review and resubmit.`,
      ];
      return {
        subject,
        html: wrapHtml("Proof not accepted", lines, ctx),
        text: `Proof for ${what} (${asset}) was not accepted.${note} Resubmit: ${ctx.url}`,
        sms: sms(`DueMate: proof for ${what} not accepted.${note} ${ctx.url}`),
      };
    }
    case "invite.renter": {
      const subject = `You're invited to an agreement on ${asset}`;
      const link = ctx.inviteUrl ?? ctx.url;
      const lines = [
        `${ctx.lessorName ?? "A lessor"} has added you to an agreement covering <b>${asset}</b>.`,
        `You'll get reminders before each due date and can upload proof once you accept.`,
      ];
      return {
        subject,
        html: wrapHtml("Agreement invitation", lines, { ...ctx, url: link }),
        text: `You've been invited to an agreement on ${asset}. Accept: ${link}`,
        sms: sms(`DueMate: you've been invited to an agreement on ${asset}. ${link}`),
      };
    }
    case "escalation.lessor": {
      const subject = `Action needed: ${what} is escalated`;
      const lines = [
        `<b>${what}</b>${amountLine(ctx)} for <b>${asset}</b> (due ${due}) has passed the full reminder schedule without confirmation.`,
        `Automated reminders have stopped. Follow up manually or waive it.`,
      ];
      return {
        subject,
        html: wrapHtml("Escalated — manual follow-up", lines, ctx),
        text: `Escalated: ${what} (${asset}), due ${due}, no confirmation. Handle manually: ${ctx.url}`,
        sms: sms(`DueMate: ${what} (${asset}) escalated, no confirmation. ${ctx.url}`),
      };
    }
  }
}

void money;
