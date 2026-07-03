import { NextRequest, NextResponse } from "next/server";
import { creditReferrals } from "@/lib/server/referral";
import { supabaseAdmin } from "@/lib/supabase";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";
import { advanceBracket } from "@/lib/server/bracket";
import { verifyToken } from "@/lib/server/profileToken";
import { notify } from "@/lib/server/push";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/**
 * Resign a staked match: you concede, your opponent wins the pot instantly.
 * No waiting out the idle-forfeit window, no hostage matches. Authenticated —
 * resigning costs you your stake, so only your own session token may do it.
 *
 * Body: { id, player, token }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "resign", 12, 10_000);
    if (rl) return rl;
    const { id, player, token } = await req.json();
    if (id === undefined || !player) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const me = String(player).toLowerCase();
    if (!token || verifyToken(String(token)) !== me) {
      return NextResponse.json({ error: "Sign in to resign" }, { status: 401 });
    }
    const db = supabaseAdmin();

    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "active") return NextResponse.json({ error: "Match is not active" }, { status: 409 });

    const participants = [match.creator, match.opponent].filter(Boolean).map((a: string) => a.toLowerCase());
    if (!participants.includes(me)) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
    const winner = participants.find((a) => a !== me);
    if (!winner) return NextResponse.json({ error: "No opponent yet — cancel the room instead" }, { status: 409 });

    // bracket sub-match: concede advances the bracket; the tournament escrow
    // pays the podium later, so there's no money to move here
    if (match.tournament_id) {
      await db.from("matches").update({ status: "settled", winner, settle_error: null }).eq("id", Number(id));
      await advanceBracket(db, Number(match.tournament_id));
      void notify([winner], {
        title: "Opponent resigned ✅",
        body: `Room #${id}: they conceded — you advance.`,
        url: `/tournament/${match.tournament_id}`,
      });
      return NextResponse.json({ ok: true, settled: true, winner });
    }

    // money match: opponent takes the pot, settled on-chain right now
    await db.from("matches").update({ status: "settling", winner, settle_error: null }).eq("id", Number(id));
    if (!relayerConfigured()) return NextResponse.json({ ok: true, settled: false, winner });
    try {
      const settleTx = await settleOnChain(BigInt(id), winner, Number(match.chain_id));
      await db.from("matches").update({ status: "settled", settle_tx: settleTx, settle_error: null }).eq("id", Number(id));
      void creditReferrals([match.creator, match.opponent]);
      void notify([winner], {
        title: "Opponent resigned — you win! 💰",
        body: `Room #${id}: the pot is on its way to your wallet.`,
        url: "/",
      });
      return NextResponse.json({ ok: true, settled: true, winner, settleTx });
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("matches").update({ settle_error }).eq("id", Number(id));
      // stays in `settling` — the winner's client can drive the retry path
      return NextResponse.json({ ok: true, settled: false, winner, error: settle_error }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
