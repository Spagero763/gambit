import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/server/profileToken";
import { settleRanking, relayerConfigured } from "@/lib/server/settle";
import { rankTop3, newSeed, TPlayer } from "@/lib/server/tournament";

export const runtime = "nodejs";

const FORCE_SETTLE_MS = 30 * 60 * 1000; // anyone can settle 30 min after creation
const clampScore = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0;
};

async function loadPlayers(db: ReturnType<typeof supabaseAdmin>, id: number): Promise<TPlayer[]> {
  const { data } = await db.from("tournament_players").select("address,score").eq("tournament_id", id);
  return (data as TPlayer[]) ?? [];
}

/** Rank the field and pay the top three on-chain. Shared by auto + manual settle. */
async function settleTournament(db: ReturnType<typeof supabaseAdmin>, t: any) {
  const players = await loadPlayers(db, t.id);
  if (players.length < 3) throw new Error("Need at least 3 players to settle");
  const ranking = rankTop3(players);
  await db.from("tournaments").update({ status: "settling", winners: ranking, settle_error: null }).eq("id", t.id);
  if (!relayerConfigured()) return { settled: false, ranking };
  try {
    const tx = await settleRanking(BigInt(t.id), ranking, Number(t.chain_id));
    await db.from("tournaments").update({ status: "settled", settle_tx: tx, settle_error: null }).eq("id", t.id);
    return { settled: true, ranking, settleTx: tx };
  } catch (e: any) {
    const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
    await db.from("tournaments").update({ settle_error }).eq("id", t.id);
    return { settled: false, ranking, error: settle_error };
  }
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
        .select("address,score,submitted_at")
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
      await db.from("tournament_players").upsert({ tournament_id: Number(id), address: creator }, { onConflict: "tournament_id,address", ignoreDuplicates: true });
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
      const { data: me } = await db.from("tournament_players").select("score").eq("tournament_id", Number(id)).eq("address", addr).maybeSingle();
      if (!me) return NextResponse.json({ error: "Not in this tournament" }, { status: 403 });
      const best = Math.max(clampScore(body.score), me.score ?? 0);
      await db.from("tournament_players").update({ score: best, submitted_at: new Date().toISOString() }).eq("tournament_id", Number(id)).eq("address", addr);
      // auto-settle once everyone has played
      const players = await loadPlayers(db, Number(id));
      if (players.length >= 3 && players.every((p) => p.score !== null && p.score !== undefined)) {
        const res = await settleTournament(db, t);
        return NextResponse.json({ ok: true, best, settled: res.settled });
      }
      return NextResponse.json({ ok: true, best });
    }

    if (action === "settle") {
      const { data: t } = await db.from("tournaments").select("*").eq("id", Number(id)).maybeSingle();
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (t.status === "settled") return NextResponse.json({ ok: true, settled: true, settleTx: t.settle_tx });
      if (t.status !== "active" && t.status !== "settling") {
        return NextResponse.json({ error: "Tournament is not settleable" }, { status: 409 });
      }
      const players = await loadPlayers(db, Number(id));
      const allScored = players.length >= 3 && players.every((p) => p.score !== null && p.score !== undefined);
      const elapsed = Date.now() - new Date(t.created_at).getTime();
      if (!allScored && elapsed < FORCE_SETTLE_MS) {
        return NextResponse.json({ error: "Not everyone has finished yet", retryInMs: FORCE_SETTLE_MS - elapsed }, { status: 409 });
      }
      const res = await settleTournament(db, t);
      return NextResponse.json({ ok: res.settled, ...res });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
