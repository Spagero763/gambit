import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { newTtt } from "@/lib/server/ttt";
import { newChess } from "@/lib/server/chess";
import { newSnakes } from "@/lib/server/snakes";
import { newWhot, splitWhot } from "@/lib/server/whot";
import { notify } from "@/lib/server/push";
import { readMatchPlayers, readMatchStatus } from "@/lib/server/settle";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The escrow's seats once the room is Active, retrying briefly for RPC lag. */
async function seatedOnChain(id: number, chainId: number): Promise<string[] | null> {
  for (let i = 0; i < 4; i++) {
    const [status, players] = await Promise.all([readMatchStatus(BigInt(id), chainId), readMatchPlayers(BigInt(id), chainId)]);
    if (status === 2 && players.length === 2) return players;
    if (status !== 1) return null;
    await sleep(1500);
  }
  return null;
}

/**
 * Start a match once its second seat is filled on-chain, and initialise the
 * authoritative game state. Who the opponent is comes from the escrow, never
 * from the request, so either player (or a retry) can call this safely.
 *
 * Body: { id }
 */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "join", 20, 60_000);
    if (rl) return rl;
    const { id } = await req.json();
    if (id === undefined) {
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
    if (match.status === "active") return NextResponse.json({ ok: true });
    if (match.status !== "open") {
      return NextResponse.json({ error: "Match not open" }, { status: 409 });
    }

    const seated = await seatedOnChain(Number(id), Number(match.chain_id));
    if (!seated) {
      return NextResponse.json({ error: "The second seat isn't filled on-chain yet" }, { status: 409 });
    }
    if (seated[0] !== String(match.creator).toLowerCase()) {
      return NextResponse.json({ error: "This room's creator doesn't match the escrow" }, { status: 409 });
    }
    const opp = seated[1];

    // initialise per-game authoritative state
    let state: unknown = {};
    let turn: string | null = null;
    let hidden: unknown = null;
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
      state = pub; // public row holds only top/counts/active/turn, never hands
      turn = pub.turn;
      hidden = priv;
    }

    // only the first activation wins; a racing second call must not redeal
    const { data: claimed, error: upErr } = await db
      .from("matches")
      .update({ opponent: opp, status: "active", state, turn })
      .eq("id", Number(id))
      .eq("status", "open")
      .select("id");
    if (upErr) throw upErr;
    if (!claimed?.length) return NextResponse.json({ ok: true });

    // hands are written by the call that won, so they always match its table
    if (hidden) {
      const { error: privErr } = await db
        .from("match_private")
        .upsert({ match_id: Number(id), state: hidden }, { onConflict: "match_id" });
      if (privErr) throw privErr;
    }

    // tell the creator their challenger arrived
    void notify([match.creator], {
      title: "Opponent joined! ⚔️",
      body: `Room #${id} is live. Your match starts now.`,
      url: `/play/${match.game}?room=${id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
