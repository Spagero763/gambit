import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser client (anon, read-only via RLS). Null if not configured yet. */
export const supabase: SupabaseClient | null =
  URL && ANON ? createClient(URL, ANON, { auth: { persistSession: false } }) : null;

export const supabaseReady = !!(URL && ANON);

/** Server client (service_role, bypasses RLS). Server routes only. */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
