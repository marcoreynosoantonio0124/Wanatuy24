import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().min(10),
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

/**
 * Saves a Web Push subscription for an account-less renter, identified by their
 * magic-link token. Stored against the agreement (not a user), so reminders can
 * reach them without an account.
 */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { token, endpoint, keys } = parsed.data;
  const admin = createAdminClient();

  const { data: agreement } = await admin
    .from("agreements")
    .select("id")
    .eq("renter_access_token", token)
    .single();
  if (!agreement) {
    return NextResponse.json({ error: "invalid link" }, { status: 404 });
  }

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      agreement_id: agreement.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
