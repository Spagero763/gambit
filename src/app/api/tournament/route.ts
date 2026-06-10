import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { settleRanking, relayerConfigured, readMatchStatus } from "@/lib/server/settle";
import { newSeed } from "@/lib/server/tournament";

export const runtime = "nodejs";

/**
 * Staged knockout tournaments. Everyone in a round plays the same board; when
 * all alive players have submitted (or the round window lapses), the bottom
 * half is eliminated — Quarter-final → Semi-final → Final of three. The FINAL
 * round's scores decide the on-chain top-3 payout (50/30/20).
 */

const ROUND_WINDOW_MS = 30 * 60 * 1000; // per-round force-advance window
const clampScore = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0;
};
/** Survivors per cut: half the field, never below the final three. */
const keepCount = (alive: number) => Math.max(3, Math.ceil(alive / 2));

interface PlayerRow {
  address: string;
  score: number | null;
  round_score: number | null;
  eliminated_round: number | null;
}

async function loadPlayers(db: ReturnType<typeof supabaseAdmin>, id: number): Promise<PlayerRow[]> {
  const { data } = await db
    .from("tournament_players")
    .select("address,score,round_score,eliminated_round")
    .eq("tournament_id", id);
  return (data as PlayerRow[]) ?? [];
}

const aliveOf = (players: PlayerRow[]) => players.filter((p) => p.eliminated_round === null);
const rankRound = (players: PlayerRow[]) =>
  [...players].sort(
    (a, b) =>
      (b.round_score ?? -1) - (a.round_score ?? -1) ||
      a.address.toLowerCase().localeCompare(b.address.toLowerCase())
  );

/**
 * If every alive player has scored (or force), either CUT the field (non-final
 * round) or PAY the top three (final round). Returns what happened.
 */
async function advanceOrSettle(db: ReturnType<typeof supabaseAdmin>, t: any, force: boolean) {
  const players = await loadPlayers(db, t.id);
  const alive = aliveOf(players);
  const allScored = alive.length > 0 && alive.every((p) => p.round_score !== null);
  if (!allScored && !force) return { done: false as const };

  const ranked = rankRound(alive);

  if (alive.length <= 3) {
    // FINAL — settle the pot on this round's scores
    const ranking = ranked.slice(0, 3).map((p) => p.address);
    if (ranking.length < 3) return { done: false as const, error: "Need three finalists" };
    await db.from("tournaments").update({ status: "settling", winners: ranking, settle_error: null }).eq("id", t.id);
    if (!relayerConfigured()) return { done: true as const, settled: false, ranking };
    try {
      const tx = await settleRanking(BigInt(t.id), ranking, Number(t.chain_id));
      await db.from("tournaments").update({ status: "settled", settle_tx: tx, settle_error: null }).eq("id", t.id);
      return { done: true as const, settled: true, ranking, settleTx: tx };
    } catch (e: any) {
      const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
      await db.from("tournaments").update({ settle_error }).eq("id", t.id);
      return { done: true as const, settled: false, ranking, error: settle_error };
    }
  }

  // CUT — eliminate the bottom of the round, reset scores for the survivors
  const keep = keepCount(alive.length);
  const out = ranked.slice(keep).map((p) => p.address);
  if (out.length > 0) {
    await db
      .from("tournament_players")
      .update({ eliminated_round: t.round })
      .eq("tournament_id", t.id)
      .in("address", out);
  }
  await db
    .from("tournament_players")
    .update({ round_score: null })
    .eq("tournament_id", t.id)
    .is("eliminated_round", null);
  await db.from("tournaments").update({ round: t.round + 1 }).eq("id", t.id);
  return { done: true as const, advanced: true, round: t.round + 1, eliminated: out };
}

/** GET ?id=  -> { tournament, players } ; otherwise a list of open/active ones. */
export async function GET(req: NextRequest) {
  try {
    const db = supabaseAdmin();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { data: players } = await db
        .from("tournament_players")
        .select("address,score,round_score,eliminated_round,submitted_at")
        .eq("tournament_id", Number(id));
      return NextResponse.json({ tournament: t, players: players ?? [] });
    }
    const { data } = await db
      .from("tournaments")
      .select("*")
      .in("status", ["open", "active"])
      .order("created_at", { ascending: false })
      .limit(50);
    return NextResponse.json({ tournaments: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, auth } = body;
    if (!action || id === undefined) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const db = supabaseAdmin();

    if (action === "register") {
      const creator = String(body.creator ?? "").toLowerCase();
      if (!creator || verifyToken(String(auth)) !== creator) {
        return NextResponse.json({ error: "Sign in to create a tournament" }, { status: 401 });
      }
      const capacity = Number(body.capacity);
      if (!(capacity >= 3 && capacity <= 8)) {
        return NextResponse.json({ error: "Capacity must be 3–8" }, { status: 400 });
      }
      const seed = newSeed();
      const { error } = await db.from("tournaments").upsert(
        {
          id: Number(id),
          game: String(body.game ?? "blocks"),
          chain_id: Number(body.chainId),
          token: body.token ? String(body.token) : null,
          decimals: Number(body.decimals ?? 18),
          stake: String(body.stake),
          capacity,
          seed,
          creator,
          status: "open",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      if (error) throw error;
      await db
        .from("tournament_players")
        .upsert({ tournament_id: Number(id), address: creator }, { onConflict: "tournament_id,address", ignoreDuplicates: true });
      const { data: t } = await db.from("tournaments").select("seed").eq("id", Number(id)).maybeSingle();
      return NextResponse.json({ ok: true, seed: t?.seed ?? seed });
    }

    if (action === "join") {
      const addr = String(body.address ?? "").toLowerCase();
      if (!addr || verifyToken(String(auth)) !== addr) {
        return NextResponse.json({ error: "Sign in to join" }, { status: 401 });
      }
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (t.status !== "open") return NextResponse.json({ error: "Tournament is not open" }, { status: 409 });
      const players = await loadPlayers(db, Number(id));
      if (!players.some((p) => p.address.toLowerCase() === addr)) {
        if (players.length >= t.capacity) return NextResponse.json({ error: "Tournament is full" }, { status: 409 });
        await db.from("tournament_players").insert({ tournament_id: Number(id), address: addr });
      }
      const count = (await loadPlayers(db, Number(id))).length;
      if (count >= t.capacity) await db.from("tournaments").update({ status: "active" }).eq("id", Number(id));
      return NextResponse.json({ ok: true, status: count >= t.capacity ? "active" : "open", seed: t.seed });
    }

    if (action === "score") {
      const addr = String(body.address ?? "").toLowerCase();
      if (!addr || verifyToken(String(auth)) !== addr) {
        return NextResponse.json({ error: "Sign in to submit" }, { status: 401 });
      }
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (t.status !== "active") return NextResponse.json({ error: "Tournament not active" }, { status: 409 });
      const { data: me } = await db
        .from("tournament_players")
        .select("score,round_score,eliminated_round")
        .eq("tournament_id", Number(id))
        .eq("address", addr)
        .maybeSingle();
      if (!me) return NextResponse.json({ error: "Not in this tournament" }, { status: 403 });
      if (me.eliminated_round !== null) {
        return NextResponse.json({ error: "You were eliminated in an earlier round" }, { status: 409 });
      }
      const submitted = clampScore(body.score);
      const best = Math.max(submitted, me.round_score ?? 0);
      await db
        .from("tournament_players")
        .update({
          round_score: best,
          score: Math.max(submitted, me.score ?? 0), // lifetime-best, for display
          submitted_at: new Date().toISOString(),
        })
        .eq("tournament_id", Number(id))
        .eq("address", addr);
      const res = await advanceOrSettle(db, t, false);
      return NextResponse.json({ ok: true, best, ...res });
    }

    if (action === "settle") {
      // advance the current round (or pay the final) — anyone can drive this
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (t.status === "settled") return NextResponse.json({ ok: true, settled: true, settleTx: t.settle_tx });
      if (t.status !== "active" && t.status !== "settling") {
        return NextResponse.json({ error: "Tournament is not settleable" }, { status: 409 });
      }
      const players = await loadPlayers(db, Number(id));
      const alive = aliveOf(players);
      const allScored = alive.length > 0 && alive.every((p) => p.round_score !== null);
      // each round gets its own window before anyone may force it forward
      const deadline = new Date(t.created_at).getTime() + t.round * ROUND_WINDOW_MS;
      if (!allScored && Date.now() < deadline) {
        return NextResponse.json(
          { error: "This round isn't finished yet", retryInMs: deadline - Date.now() },
          { status: 409 }
        );
      }
      const res = await advanceOrSettle(db, t, true);
      return NextResponse.json({ ok: res.done, ...res });
    }

    if (action === "cancel") {
      // Reconcile the row to on-chain truth after cancelMatch / reclaimStalled.
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (t.status === "cancelled") return NextResponse.json({ ok: true, cancelled: true });
      const onchain = await readMatchStatus(BigInt(id), Number(t.chain_id));
      if (onchain === 4 /* Cancelled */) {
        await db.from("tournaments").update({ status: "cancelled" }).eq("id", Number(id));
        return NextResponse.json({ ok: true, cancelled: true });
      }
      return NextResponse.json({ error: "Escrow has not refunded this tournament yet", onchainStatus: onchain }, { status: 409 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
