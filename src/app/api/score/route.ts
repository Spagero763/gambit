import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const GAMES = new Set(["blocks", "chess", "tic-tac-toe", "snakes", "whot"]);

/**
 * Submit a free-play score for the weekly events board. Casual / no funds —
 * rate-limited and clamped, requires a connected wallet address.
 *
 * Body: { address, game, score }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "score", 20, 60_000);
    if (rl) return rl;

    const { address, game, score } = await req.json();
    const addr = String(address ?? "").toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(addr) || !GAMES.has(game)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const s = Math.max(0, Math.min(50_000_000, Math.floor(Number(score) || 0)));

    const db = supabaseAdmin();
    const { error } = await db.from("scores").insert({ address: addr, game, score: s });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
