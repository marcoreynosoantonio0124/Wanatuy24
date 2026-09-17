import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client. Create it lazily inside event handlers / effects,
 * never at module scope, so a missing env var can't crash server prerender.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
