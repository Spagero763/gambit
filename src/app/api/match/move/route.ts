import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { applyTtt, TttState } from "@/lib/server/ttt";
import { applyChessMove, ChessState } from "@/lib/server/chess";
import { applySnakesRoll, SnakesState } from "@/lib/server/snakes";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";

interface MoveOutcome {
  state: { turn: string };
  finished: boolean;
  winner: string | null;
  draw: boolean;
}

export const runtime = "nodejs";

/**
 * Authoritative move handler. The server validates the move against its own
 * copy of the board, advances state, and on game-end settles on-chain via the
 * relayer. Clients can never declare a winner; they only submit moves.
 *
 * Body: { id, player, move }   // move shape is per-game (ttt: { cell })
 */
export async function POST(req: NextRequest) {
  try {
    const { id, player, move } = await req.json();
    if (id === undefined || !player || !move) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const db = supabaseAdmin();

    const { data: match, error } = await db
      .from("matches")
      .select("*")
      .eq("id", Number(id))
      .single();
    if (error || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status !== "active") {
      return NextResponse.json({ error: "Match not active" }, { status: 409 });
    }

    // validate + apply (per-game authoritative rules)
    let outcome: MoveOutcome;
    try {
      if (match.game === "tic-tac-toe") {
        outcome = applyTtt(match.state as TttState, String(player), Number(move.cell));
      } else if (match.game === "chess") {
        outcome = applyChessMove(match.state as ChessState, String(player), move);
      } else if (match.game === "snakes") {
        outcome = applySnakesRoll(match.state as SnakesState, String(player));
      } else {
        return NextResponse.json({ error: "Unsupported game" }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Illegal move" }, { status: 422 });
    }

    // log the move
    const { count } = await db
      .from("moves")
      .select("*", { count: "exact", head: true })
      .eq("match_id", Number(id));
    await db.from("moves").insert({
      match_id: Number(id),
      player: String(player).toLowerCase(),
      move,
      ply: (count ?? 0) + 1,
    });

    if (!outcome.finished) {
      await db
        .from("matches")
        .update({ state: outcome.state, turn: outcome.state.turn })
        .eq("id", Number(id));
      return NextResponse.json({ ok: true, finished: false, state: outcome.state });
    }

    // finished: mark settling, settle on-chain, record result
    await db
      .from("matches")
      .update({ state: outcome.state, status: "settling", winner: outcome.winner, settle_error: null })
      .eq("id", Number(id));

    let settleTx: string | null = null;
    if (relayerConfigured()) {
      try {
        settleTx = await settleOnChain(BigInt(id), outcome.winner, Number(match.chain_id));
      } catch (e: any) {
        // leave as 'settling' so it can be retried; record the real reason
        await db
          .from("matches")
          .update({ settle_error: String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300) })
          .eq("id", Number(id));
        return NextResponse.json(
          { ok: true, finished: true, winner: outcome.winner, settled: false, state: outcome.state },
          { status: 200 }
        );
      }
    }

    await db
      .from("matches")
      .update({ status: "settled", settle_tx: settleTx, settle_error: null })
      .eq("id", Number(id));

    return NextResponse.json({
      ok: true,
      finished: true,
      winner: outcome.winner,
      draw: outcome.draw,
      settled: !!settleTx,
      settleTx,
      state: outcome.state,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
