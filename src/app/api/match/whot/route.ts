import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  WhotPublic,
  WhotPrivate,
  mergeWhot,
  splitWhot,
  applyWhotPlay,
  applyWhotDraw,
} from "@/lib/server/whot";
import { settleOnChain, relayerConfigured } from "@/lib/server/settle";
import { verifyToken } from "@/lib/server/profileToken";
import { limited } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

/** Build the per-player redacted view (you only ever see your own hand). */
function view(match: any, priv: WhotPrivate | null, player: string) {
  const pub = (match.state ?? {}) as Partial<WhotPublic>;
  const addr = player.toLowerCase();
  return {
    ok: true,
    status: match.status as string,
    winner: (match.winner as string | null) ?? null,
    settleTx: (match.settle_tx as string | null) ?? null,
    chainId: match.chain_id as number,
    turn: pub.turn ?? null,
    top: pub.top ?? null,
    active: pub.active ?? null,
    pending: pub.pending ?? null,
    counts: pub.counts ?? {},
    order: pub.order ?? [],
    yourHand: priv?.hands?.[addr] ?? [],
    settleError: (match.settle_error as string | null) ?? null,
    updatedAt: (match.updated_at as string | null) ?? null,
  };
}

async function loadPrivate(db: ReturnType<typeof supabaseAdmin>, id: number): Promise<WhotPrivate | null> {
  const { data } = await db.from("match_private").select("state").eq("match_id", id).maybeSingle();
  return (data?.state as WhotPrivate) ?? null;
}

/** GET /api/match/whot?id=&player= -> redacted view */
export async function GET(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    const player = req.nextUrl.searchParams.get("player") ?? "";
    if (!id || !player) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();
    const { data: match } = await db.from("matches").select("*").eq("id", id).single();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const priv = await loadPrivate(db, id);
    return NextResponse.json(view(match, priv, player));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

/** POST /api/match/whot  { id, player, action } -> redacted view */
export async function POST(req: NextRequest) {
  try {
    const rl = limited(req, "whot", 60, 10_000);
    if (rl) return rl;
    const { id, player, action, token } = await req.json();
    if (id === undefined || !player || !action) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (!token || verifyToken(String(token)) !== String(player).toLowerCase()) {
      return NextResponse.json({ error: "Sign in to play (authentication required)" }, { status: 401 });
    }
    const db = supabaseAdmin();
    const { data: match, error } = await db.from("matches").select("*").eq("id", Number(id)).single();
    if (error || !match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.game !== "whot") return NextResponse.json({ error: "Not a whot match" }, { status: 400 });
    if (match.status !== "active") return NextResponse.json({ error: "Match not active" }, { status: 409 });

    const priv = await loadPrivate(db, Number(id));
    if (!priv) return NextResponse.json({ error: "No state" }, { status: 409 });
    const full = mergeWhot(match.state as WhotPublic, priv);

    let outcome;
    try {
      if (action.type === "play") {
        outcome = applyWhotPlay(full, String(player), String(action.cardId), action.called);
      } else if (action.type === "draw") {
        outcome = applyWhotDraw(full, String(player));
      } else {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Illegal move" }, { status: 422 });
    }

    const { pub, priv: nextPriv } = splitWhot(outcome.full);
    await db.from("match_private").upsert({ match_id: Number(id), state: nextPriv }, { onConflict: "match_id" });

    if (!outcome.finished) {
      await db.from("matches").update({ state: pub, turn: pub.turn }).eq("id", Number(id));
      return NextResponse.json(view({ ...match, state: pub }, nextPriv, String(player)));
    }

    // finished: settle on-chain (on the match's own chain)
    await db.from("matches").update({ state: pub, status: "settling", winner: outcome.winner, settle_error: null }).eq("id", Number(id));
    let settleTx: string | null = null;
    if (relayerConfigured()) {
      try {
        settleTx = await settleOnChain(BigInt(id), outcome.winner, Number(match.chain_id));
      } catch (e: any) {
        const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
        await db.from("matches").update({ settle_error }).eq("id", Number(id));
        return NextResponse.json(
          view({ ...match, state: pub, status: "settling", winner: outcome.winner, settle_error }, nextPriv, String(player))
        );
      }
    }
    await db.from("matches").update({ status: "settled", settle_tx: settleTx, settle_error: null }).eq("id", Number(id));
    return NextResponse.json(
      view({ ...match, state: pub, status: "settled", winner: outcome.winner, settle_tx: settleTx }, nextPriv, String(player))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
