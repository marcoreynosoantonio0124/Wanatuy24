import webpush from "web-push";

let configured = false;

/** Configures web-push from env. Returns false if VAPID keys are missing. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushResult = "sent" | "gone" | "failed" | "skipped";

/** Sends one push. Returns "gone" (410/404 → prune the subscription). */
export async function sendPush(
  target: PushTarget,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<PushResult> {
  if (!ensureConfigured()) return "skipped";
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "gone";
    return "failed";
  }
}
