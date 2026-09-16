/**
 * Notification channel abstraction (spec §5.1, A2). Business logic depends only
 * on the NotificationChannel interface; concrete channels are swappable.
 * EMAIL and IN_APP are real; SMS is a logging stub until a Twilio adapter is
 * added (spec A2) — flip SMS_ENABLED and drop in TwilioSmsChannel without
 * touching any business logic.
 */

export type ChannelKey = "EMAIL" | "SMS" | "IN_APP";

export interface RenderedNotification {
  channel: ChannelKey;
  to: { userId?: string; email?: string; phone?: string };
  subject?: string; // email
  html?: string; // email
  text: string; // email text part / sms body / in-app body
  templateKey: string;
  occurrenceId?: string;
  /** Deep link to the occurrence (spec §5.2, §6.4). */
  url?: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface NotificationChannel {
  key: ChannelKey;
  send(n: RenderedNotification): Promise<SendResult>;
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

/**
 * EmailChannel. In production wire Resend (if RESEND_API_KEY set) or SMTP via
 * Nodemailer. With neither configured it logs to stdout so local/dev and CI
 * work without external services. Reminders are transactional; add
 * List-Unsubscribe headers for non-critical mail at the transport layer
 * (spec §8).
 */
export class EmailChannel implements NotificationChannel {
  key = "EMAIL" as const;

  constructor(
    private deps: {
      from: string;
      resendApiKey?: string;
      smtp?: { host: string; port: number; user: string; pass: string };
      logger?: (msg: string) => void;
    }
  ) {}

  async send(n: RenderedNotification): Promise<SendResult> {
    if (!n.to.email) return { ok: false, error: "no recipient email" };

    if (this.deps.resendApiKey) {
      // TODO wire Resend SDK: resend.emails.send({ from, to, subject, html, text })
      // Left as an adapter point to keep this module dependency-free.
      return this.logFallback(n, "resend-not-wired");
    }
    if (this.deps.smtp?.host) {
      // TODO wire Nodemailer transport with SMTP_* env.
      return this.logFallback(n, "smtp-not-wired");
    }
    return this.logFallback(n, "dev-log");
  }

  private logFallback(n: RenderedNotification, mode: string): SendResult {
    const log = this.deps.logger ?? ((m: string) => console.log(m));
    log(
      `[EMAIL:${mode}] to=${n.to.email} subject=${JSON.stringify(n.subject)} template=${n.templateKey}`
    );
    return { ok: true, providerId: `${mode}:${Date.now()}` };
  }
}

// ─── IN-APP ──────────────────────────────────────────────────────────────────

export interface InAppStore {
  create(entry: {
    userId: string;
    occurrenceId?: string;
    templateKey: string;
    text: string;
    url?: string;
  }): Promise<{ id: string }>;
}

/**
 * InAppChannel writes to the Notification table (via an injected store) so the
 * badge/SSE surface can read it (spec §5.1).
 */
export class InAppChannel implements NotificationChannel {
  key = "IN_APP" as const;
  constructor(private store: InAppStore) {}

  async send(n: RenderedNotification): Promise<SendResult> {
    if (!n.to.userId) return { ok: false, error: "in-app requires a registered user" };
    const { id } = await this.store.create({
      userId: n.to.userId,
      occurrenceId: n.occurrenceId,
      templateKey: n.templateKey,
      text: n.text,
      url: n.url,
    });
    return { ok: true, providerId: id };
  }
}

// ─── SMS (STUB — spec A2) ─────────────────────────────────────────────────────

/**
 * SmsChannel STUB. Logs and returns ok. To enable SMS, implement a
 * TwilioSmsChannel using:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * and register it in the channel registry instead of this stub. Body is the
 * ≤160-char SMS template variant (spec §5.2). No business logic changes.
 */
export class SmsChannel implements NotificationChannel {
  key = "SMS" as const;
  constructor(private logger: (msg: string) => void = (m) => console.log(m)) {}

  async send(n: RenderedNotification): Promise<SendResult> {
    // TODO Twilio: const client = twilio(SID, TOKEN);
    //   await client.messages.create({ from: FROM, to: n.to.phone, body: n.text })
    this.logger(`[SMS:stub] to=${n.to.phone ?? "?"} body=${JSON.stringify(n.text.slice(0, 160))}`);
    return { ok: true, providerId: `sms-stub:${Date.now()}` };
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

export class ChannelRegistry {
  private channels = new Map<ChannelKey, NotificationChannel>();
  register(channel: NotificationChannel): this {
    this.channels.set(channel.key, channel);
    return this;
  }
  get(key: ChannelKey): NotificationChannel | undefined {
    return this.channels.get(key);
  }
  async send(n: RenderedNotification): Promise<SendResult> {
    const channel = this.channels.get(n.channel);
    if (!channel) return { ok: false, error: `no channel registered for ${n.channel}` };
    return channel.send(n);
  }
}
