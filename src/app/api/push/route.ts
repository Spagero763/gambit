import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** Register / forget a device for push alerts. Subscribe is token-verified. */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "push", 10, 30_000);
    if (rl) return rl;
    const { action, address, sub, endpoint, token } = await req.json();
    const db = supabaseAdmin();

    if (action === "subscribe") {
      const addr = String(address ?? "").toLowerCase();
      if (!addr || verifyToken(String(token)) !== addr) {
        return NextResponse.json({ error: "Sign in first" }, { status: 401 });
      }
      if (!sub?.endpoint) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
      const { error } = await db
        .from("push_subs")
        .upsert({ endpoint: String(sub.endpoint), address: addr, sub }, { onConflict: "endpoint" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "unsubscribe") {
      if (!endpoint) return NextResponse.json({ error: "Bad request" }, { status: 400 });
      // knowing the endpoint URL is proof enough of device ownership
      await db.from("push_subs").delete().eq("endpoint", String(endpoint));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
