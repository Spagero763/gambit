import { NextRequest, NextResponse } from "next/server";
import { creditReferrals } from "@/lib/server/referral";
import { supabaseAdmin } from "@/lib/supabase";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";
import { advanceBracket } from "@/lib/server/bracket";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

// If the player to move is idle for longer than this, their opponent may claim
// the win by forfeit. Generous enough for slow connections / a quick think.
const TURN_TIMEOUT_MS = 120_000;

/**
 * Claim a win when the opponent abandons (device off, closed app, ragequit).
 * The waiting player wins the pot. This — plus the contract's permissionless
 * `reclaimStalled` after 1h — means staked funds can never get stuck.
 *
 * Body: { id, player }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "claim", 12, 10_000);
    if (rl) return rl;
    const { id, player } = await req.json();
    if (id === undefined || !player) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "active") return NextResponse.json({ error: "Match is not active" }, { status: 409 });

    const me = String(player).toLowerCase();
    const participants = [match.creator, match.opponent].filter(Boolean).map((a: string) => a.toLowerCase());
    if (!participants.includes(me)) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });

    const toMove = String(match.turn ?? (match.state as any)?.turn ?? "").toLowerCase();
    if (!toMove) return NextResponse.json({ error: "No active turn" }, { status: 409 });
    if (toMove === me) return NextResponse.json({ error: "It's your turn — just make your move" }, { status: 409 });

    const elapsed = Date.now() - new Date(match.updated_at).getTime();
    if (elapsed < TURN_TIMEOUT_MS) {
      return NextResponse.json(
        { error: "Opponent still has time", remainingMs: TURN_TIMEOUT_MS - elapsed },
        { status: 409 }
      );
    }

    // bracket sub-match: forfeit advances the bracket; no on-chain settle here
    if (match.tournament_id) {
      await db.from("matches").update({ status: "settled", winner: me, settle_error: null }).eq("id", Number(id));
      await advanceBracket(db, Number(match.tournament_id));
      return NextResponse.json({ ok: true, settled: true, winner: me });
    }

    // opponent timed out → you win by forfeit
    await db.from("matches").update({ status: "settling", winner: me, settle_error: null }).eq("id", Number(id));
    if (!relayerConfigured()) {
      return NextResponse.json({ ok: true, settled: false, winner: me });
    }
    try {
      const settleTx = await settleOnChain(BigInt(id), me, Number(match.chain_id));
      await db.from("matches").update({ status: "settled", settle_tx: settleTx, settle_error: null }).eq("id", Number(id));
      void creditReferrals([match.creator, match.opponent]);
      return NextResponse.json({ ok: true, settled: true, winner: me, settleTx });
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("matches").update({ settle_error }).eq("id", Number(id));
      return NextResponse.json({ ok: false, settled: false, error: settle_error }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
