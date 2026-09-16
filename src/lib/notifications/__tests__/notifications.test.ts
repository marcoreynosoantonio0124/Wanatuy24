import { describe, it, expect } from "vitest";
import { renderTemplate, type TemplateContext, type TemplateKey } from "@/lib/notifications/templates";
import {
  EmailChannel,
  InAppChannel,
  SmsChannel,
  ChannelRegistry,
  type InAppStore,
} from "@/lib/notifications/channels";

const ctx: TemplateContext = {
  obligationTitle: "March rent",
  assetLabel: "Marina apartment 1204",
  amount: "AED 5,000.00",
  currency: "AED",
  dueAt: new Date("2024-03-01T05:00:00Z"),
  timezone: "Asia/Dubai",
  url: "https://app.duemate.test/occurrences/occ_123",
  renterName: "Sara",
  lessorName: "Omar",
  reviewNote: "Amount is short by AED 200",
  inviteUrl: "https://app.duemate.test/invite/tok",
};

const ALL_KEYS: TemplateKey[] = [
  "reminder.upcoming",
  "reminder.due",
  "reminder.overdue",
  "proof.submitted",
  "proof.accepted",
  "proof.rejected",
  "invite.renter",
  "escalation.lessor",
];

describe("templates (spec §5.2)", () => {
  it("renders every template with subject/html/text/sms", () => {
    for (const key of ALL_KEYS) {
      const t = renderTemplate(key, ctx);
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.html).toContain("DueMate");
      expect(t.text.length).toBeGreaterThan(0);
      expect(t.sms.length).toBeGreaterThan(0);
    }
  });

  it("keeps every SMS variant within 160 characters", () => {
    for (const key of ALL_KEYS) {
      const t = renderTemplate(key, ctx);
      expect(t.sms.length).toBeLessThanOrEqual(160);
    }
  });

  it("reminders include what, amount, and the deep link", () => {
    const t = renderTemplate("reminder.due", ctx);
    expect(t.text).toContain("March rent");
    expect(t.text).toContain("AED 5,000.00");
    expect(t.text).toContain(ctx.url);
  });

  it("rejection surfaces the review note", () => {
    const t = renderTemplate("proof.rejected", ctx);
    expect(t.text).toContain("Amount is short by AED 200");
  });
});

describe("channels (spec §5.1)", () => {
  it("EmailChannel falls back to logging when no transport is configured", async () => {
    const logs: string[] = [];
    const ch = new EmailChannel({ from: "DueMate <x@y.z>", logger: (m) => logs.push(m) });
    const res = await ch.send({
      channel: "EMAIL",
      to: { email: "a@b.c" },
      subject: "Hi",
      text: "body",
      templateKey: "reminder.due",
    });
    expect(res.ok).toBe(true);
    expect(logs[0]).toContain("[EMAIL:dev-log]");
  });

  it("InAppChannel writes to the store and requires a registered user", async () => {
    const created: unknown[] = [];
    const store: InAppStore = {
      async create(entry) {
        created.push(entry);
        return { id: "notif_1" };
      },
    };
    const ch = new InAppChannel(store);
    const ok = await ch.send({
      channel: "IN_APP",
      to: { userId: "u1" },
      text: "hi",
      templateKey: "reminder.due",
    });
    expect(ok.ok).toBe(true);
    expect(ok.providerId).toBe("notif_1");

    const noUser = await ch.send({
      channel: "IN_APP",
      to: {},
      text: "hi",
      templateKey: "reminder.due",
    });
    expect(noUser.ok).toBe(false);
  });

  it("SmsChannel stub logs and returns ok (spec A2)", async () => {
    const logs: string[] = [];
    const ch = new SmsChannel((m) => logs.push(m));
    const res = await ch.send({
      channel: "SMS",
      to: { phone: "+971500000000" },
      text: "short",
      templateKey: "reminder.overdue",
    });
    expect(res.ok).toBe(true);
    expect(logs[0]).toContain("[SMS:stub]");
  });

  it("registry dispatches to the right channel", async () => {
    const reg = new ChannelRegistry()
      .register(new SmsChannel(() => {}))
      .register(new EmailChannel({ from: "x", logger: () => {} }));
    const res = await reg.send({
      channel: "EMAIL",
      to: { email: "a@b.c" },
      text: "t",
      templateKey: "reminder.due",
    });
    expect(res.ok).toBe(true);
    const missing = await reg.send({
      channel: "IN_APP",
      to: { userId: "u" },
      text: "t",
      templateKey: "reminder.due",
    });
    expect(missing.ok).toBe(false);
  });
});
