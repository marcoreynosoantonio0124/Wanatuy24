import crypto from "node:crypto";
import { supabaseServiceRoleKey } from "@/lib/env";

/**
 * "Act as a user" (admin impersonation) support. When an admin steps into a
 * real user's account, we drop a signed, http-only cookie holding the admin's
 * own id so they can step back out again with one tap. The cookie is signed
 * with the server-only service-role key, so it can't be forged by a client.
 */
export const RETURN_COOKIE = "du_act_return";

function sign(value: string): string {
  return crypto
    .createHmac("sha256", supabaseServiceRoleKey())
    .update(value)
    .digest("base64url");
}

/** The cookie value stored when an admin starts acting as someone. */
export function makeReturnToken(adminId: string): string {
  return `${adminId}.${sign(adminId)}`;
}

/** Returns the admin id if the token is present and its signature checks out. */
export function readReturnToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  return id;
}
