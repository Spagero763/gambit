import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { newTtt } from "@/lib/server/ttt";
import { newChess } from "@/lib/server/chess";
import { newSnakes } from "@/lib/server/snakes";
import { newWhot, splitWhot } from "@/lib/server/whot";

export const runtime = "nodejs";

/**
 * Mark a match as joined and initialise authoritative game state. Called after
 * the opponent's on-chain joinMatch succeeds.
 *
 * Body: { id, opponent }
 */
export async function POST(req: NextRequest) {
  try {
    const { id, opponent } = await req.json();
    if (id === undefined || !opponent) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const db = supabaseAdmin();

    const { data: match, error: readErr } = await db
      .from("matches")
      .select("*")
      .eq("id", Number(id))
      .single();
    if (readErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status !== "open") {
      return NextResponse.json({ error: "Match not open" }, { status: 409 });
    }

    const opp = String(opponent).toLowerCase();
    if (opp === match.creator) {
      return NextResponse.json({ error: "Cannot join your own match" }, { status: 400 });
    }

    // initialise per-game authoritative state
    let state: unknown = {};
    let turn: string | null = null;
    if (match.game === "tic-tac-toe") {
      const s = newTtt(match.creator, opp);
      state = s;
      turn = s.turn;
    } else if (match.game === "chess") {
      const s = newChess(match.creator, opp);
      state = s;
      turn = s.turn;
    } else if (match.game === "snakes") {
      const s = newSnakes(match.creator, opp);
      state = s;
      turn = s.turn;
    } else if (match.game === "whot") {
      const { pub, priv } = splitWhot(newWhot(match.creator, opp));
      state = pub; // public row holds only top/counts/active/turn — never hands
      turn = pub.turn;
      const { error: privErr } = await db
        .from("match_private")
        .upsert({ match_id: Number(id), state: priv }, { onConflict: "match_id" });
      if (privErr) throw privErr;
    }

    const { error: upErr } = await db
      .from("matches")
      .update({ opponent: opp, status: "active", state, turn })
      .eq("id", Number(id));
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
