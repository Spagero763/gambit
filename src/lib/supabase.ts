import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A read that hangs would leave every list on its loading skeleton forever.
// Giving up after a few seconds lets each screen fall through to its empty state.
const timedFetch: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  init?.signal?.addEventListener("abort", () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

/** Browser client (anon, read-only via RLS). Null if not configured yet. */
export const supabase: SupabaseClient | null =
  URL && ANON ? createClient(URL, ANON, { auth: { persistSession: false }, global: { fetch: timedFetch } }) : null;

export const supabaseReady = !!(URL && ANON);

/** Server client (service_role, bypasses RLS). Server routes only. */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin not configured");
  return createClient(url, key, { auth: { persistSession: false }, global: { fetch: timedFetch } });
}
