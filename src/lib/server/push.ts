import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Server-side push: look up the wallets' registered devices and notify them.
 * Fire-and-forget by design — a push failure must NEVER fail game logic.
 */

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BPxpkRzBPPbV4L_3DDaXwQkc_tEr-bme5VSagbUyXrDBDgpWFnmHZE42EXrHuwXD9TGqjALBZA_W0ZjJQZQ3OAE";

let configured = false;
function ensureConfigured(): boolean {
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!priv) return false;
  if (!configured) {
    webpush.setVapidDetails("mailto:spageroafolabi@gmail.com", PUBLIC_KEY, priv);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string; // same-tag notifications replace each other (e.g. turn pings)
}

/** Notify every registered device of the given wallet addresses. */
export async function notify(addresses: string[], payload: PushPayload): Promise<void> {
  try {
    if (!ensureConfigured() || addresses.length === 0) return;
    const db = supabaseAdmin();
    const lower = addresses.map((a) => a.toLowerCase());
    const { data: subs } = await db
      .from("push_subs")
      .select("endpoint,sub")
      .in("address", lower);
    if (!subs?.length) return;
    const json = JSON.stringify(payload);
    await Promise.allSettled(
      subs.map(async (row: { endpoint: string; sub: any }) => {
        try {
          await webpush.sendNotification(row.sub, json);
        } catch (e: any) {
          // endpoint gone (user revoked / browser cleared) — prune it
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await db.from("push_subs").delete().eq("endpoint", row.endpoint);
          }
        }
      })
    );
  } catch {
    /* never let push errors surface into game flows */
  }
}
