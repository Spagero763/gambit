import { SupabaseClient } from "@supabase/supabase-js";
import { newTtt } from "@/lib/server/ttt";
import { newChess } from "@/lib/server/chess";
import { newSnakes } from "@/lib/server/snakes";
import { newWhot, newWhotTable, splitWhot } from "@/lib/server/whot";
import { settleRanking, relayerConfigured } from "@/lib/server/settle";
import { notify } from "@/lib/server/push";

/**
 * Bracket cups: four players stake into ONE escrow pot, then play real 1v1
 * sub-matches — two semi-finals on separate boards, winners meet in the final,
 * losers play a bronze match (the pot pays exactly top three: 50/30/20).
 *
 * Sub-matches are ordinary rows in `matches` (so the existing boards, move
 * auth, chat and turn-forfeit all just work) — but they carry tournament_id,
 * hold no stake of their own, and NEVER settle on-chain. Only the finished
 * bracket settles the tournament's escrow once, to [champion, runner-up, 3rd].
 */

// Sub-match ids must never collide with on-chain escrow ids. On-chain ids are
// small sequential integers; park brackets a trillion away (still < 2^53).
const BRACKET_BASE = 1_000_000_000_000;
export const slotId = (tournamentId: number, slot: number) => BRACKET_BASE + tournamentId * 10 + slot;
export const isBracketMatchId = (id: number) => id >= BRACKET_BASE;

export const BRACKET_GAMES = ["chess", "tic-tac-toe", "snakes", "whot"] as const;
export const BRACKET_SIZES = [4, 8] as const; // knockouts need powers of two (contract max 8)

// Slot layout:
//   capacity 4: 0/1 = semis,      2 = bronze, 3 = final
//   capacity 8: 0-3 = quarters, 4/5 = semis,  6 = bronze, 7 = final
const SEMIS = (cap: number) => (cap === 8 ? [4, 5] : [0, 1]);
const BRONZE = (cap: number) => (cap === 8 ? 6 : 2);
const FINAL = (cap: number) => (cap === 8 ? 7 : 3);

/** Deterministic shuffle from the tournament seed — fair, reproducible draw. */
function drawOrder<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Create one sub-match row (active, state initialised for the game). */
async function createSubMatch(
  db: SupabaseClient,
  t: { id: number; game: string; chain_id: number },
  slot: number,
  a: string,
  b: string
) {
  const id = slotId(t.id, slot);
  let state: unknown = {};
  let turn: string | null = null;
  let priv: unknown | null = null;
  if (t.game === "tic-tac-toe") {
    const s = newTtt(a, b);
    state = s;
    turn = s.turn;
  } else if (t.game === "chess") {
    const s = newChess(a, b);
    state = s;
    turn = s.turn;
  } else if (t.game === "snakes") {
    const s = newSnakes(a, b);
    state = s;
    turn = s.turn;
  } else if (t.game === "whot") {
    const split = splitWhot(newWhot(a, b));
    state = split.pub;
    turn = split.pub.turn;
    priv = split.priv;
  }
  // ORDER MATTERS: match_private has a foreign key onto matches(id), so the
  // match row must exist FIRST — writing priv before it silently failed and
  // dealt a Whot sub-match with no hands.
  const { error: mErr } = await db.from("matches").upsert(
    {
      id,
      game: t.game,
      chain_id: t.chain_id,
      stake: "0", // the money lives in the tournament escrow, not here
      creator: a,
      opponent: b,
      status: "active",
      state,
      turn,
      tournament_id: t.id,
      bracket_slot: slot,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (mErr) throw mErr;
  if (priv !== null) {
    const { error: pErr } = await db.from("match_private").upsert({ match_id: id, state: priv }, { onConflict: "match_id" });
    if (pErr) throw pErr;
  }
  return id;
}

/** Reset a drawn sub-match for an instant rematch (brackets need a winner). */
export async function rematchSubMatch(db: SupabaseClient, match: any) {
  const a = match.creator as string;
  const b = match.opponent as string;
  let state: unknown = {};
  let turn: string | null = null;
  if (match.game === "tic-tac-toe") {
    const s = newTtt(a, b);
    state = s;
    turn = s.turn;
  } else if (match.game === "chess") {
    const s = newChess(a, b);
    state = s;
    turn = s.turn;
  } else if (match.game === "snakes") {
    const s = newSnakes(a, b);
    state = s;
    turn = s.turn;
  } else {
    const { pub, priv } = splitWhot(newWhot(a, b));
    state = pub;
    turn = pub.turn;
    await db.from("match_private").upsert({ match_id: match.id, state: priv }, { onConflict: "match_id" });
  }
  await db.from("matches").update({ state, turn, status: "active", winner: null }).eq("id", match.id);
}

/** Once the escrow is full: draw the field and open the first round. */
export async function seedBracket(db: SupabaseClient, t: any) {
  const { data: existing } = await db.from("matches").select("id").eq("tournament_id", t.id).limit(1);
  if (existing?.length) return; // already seeded (idempotent)
  const { data: players } = await db.from("tournament_players").select("address").eq("tournament_id", t.id);
  const field = drawOrder((players ?? []).map((p: any) => p.address.toLowerCase()), t.seed);
  if (field.length === 4) {
    await createSubMatch(db, t, 0, field[0], field[3]);
    await createSubMatch(db, t, 1, field[1], field[2]);
  } else if (field.length === 8) {
    for (let i = 0; i < 4; i++) {
      await createSubMatch(db, t, i, field[i * 2], field[i * 2 + 1]);
    }
  } else {
    return;
  }
  void notify(field, {
    title: "Your cup is live! 🏁",
    body: `Cup #${t.id}: the ${field.length === 8 ? "quarter-finals are" : "semi-finals are"} set — find your board and play.`,
    url: `/tournament/${t.id}`,
  });
}

const winnerOf = (m: any): string | null => (m?.status === "settled" && m?.winner ? String(m.winner).toLowerCase() : null);
const loserOf = (m: any): string | null => {
  const w = winnerOf(m);
  if (!w) return null;
  const pair = [m.creator, m.opponent].map((x: string) => x.toLowerCase());
  return pair.find((x: string) => x !== w) ?? null;
};

/**
 * Called whenever a sub-match finishes: open the bronze + final once both
 * semis are done; settle the tournament escrow once bronze + final are done.
 * Idempotent — safe to call repeatedly.
 */
export async function advanceBracket(db: SupabaseClient, tournamentId: number) {
  const { data: t } = await db.from("tournaments").select("*").eq("id", tournamentId).maybeSingle();
  if (!t || t.status === "settled" || t.status === "cancelled") return;
  const cap = Number(t.capacity);
  const { data: subs } = await db.from("matches").select("*").eq("tournament_id", tournamentId);
  const bySlot: Record<number, any> = {};
  for (const m of subs ?? []) bySlot[m.bracket_slot] = m;

  // 8-player: open the semis once all four quarter-finals have winners
  if (cap === 8) {
    const qfW = [0, 1, 2, 3].map((s) => winnerOf(bySlot[s]));
    if (qfW.every(Boolean)) {
      if (!bySlot[4]) {
        await createSubMatch(db, t, 4, qfW[0]!, qfW[1]!);
        void notify([qfW[0]!, qfW[1]!], { title: "Semi-final is live ⚔️", body: `Cup #${t.id}: win to reach the final.`, url: `/tournament/${t.id}` });
      }
      if (!bySlot[5]) {
        await createSubMatch(db, t, 5, qfW[2]!, qfW[3]!);
        void notify([qfW[2]!, qfW[3]!], { title: "Semi-final is live ⚔️", body: `Cup #${t.id}: win to reach the final.`, url: `/tournament/${t.id}` });
      }
    }
  }

  // re-read (semis may have just been created), then open bronze + final
  const { data: subsA } = await db.from("matches").select("*").eq("tournament_id", tournamentId);
  const byA: Record<number, any> = {};
  for (const m of subsA ?? []) byA[m.bracket_slot] = m;
  const [sfA, sfB] = SEMIS(cap);
  const sf1W = winnerOf(byA[sfA]);
  const sf2W = winnerOf(byA[sfB]);
  if (sf1W && sf2W) {
    if (!byA[BRONZE(cap)]) {
      const l1 = loserOf(byA[sfA])!;
      const l2 = loserOf(byA[sfB])!;
      await createSubMatch(db, t, BRONZE(cap), l1, l2);
      void notify([l1, l2], { title: "Bronze match is live 🥉", body: `Cup #${t.id}: win it to take 3rd place money.`, url: `/tournament/${t.id}` });
    }
    if (!byA[FINAL(cap)]) {
      await createSubMatch(db, t, FINAL(cap), sf1W, sf2W);
      void notify([sf1W, sf2W], { title: "The FINAL is live 🏆", body: `Cup #${t.id}: winner takes the crown — and half the pot.`, url: `/tournament/${t.id}` });
    }
  }

  // refresh after possible creation
  const { data: subs2 } = await db.from("matches").select("*").eq("tournament_id", tournamentId);
  const by2: Record<number, any> = {};
  for (const m of subs2 ?? []) by2[m.bracket_slot] = m;
  const finalW = winnerOf(by2[FINAL(cap)]);
  const bronzeW = winnerOf(by2[BRONZE(cap)]);
  if (!finalW || !bronzeW) return;

  const ranking = [finalW, loserOf(by2[FINAL(cap)])!, bronzeW];
  await db.from("tournaments").update({ status: "settling", winners: ranking, settle_error: null }).eq("id", tournamentId);
  if (!relayerConfigured()) return;
  try {
    const tx = await settleRanking(BigInt(tournamentId), ranking, Number(t.chain_id));
    await db.from("tournaments").update({ status: "settled", settle_tx: tx, settle_error: null }).eq("id", tournamentId);
    const MEDALS = ["🥇 Champion", "🥈 2nd place", "🥉 3rd place"];
    ranking.forEach((addr, i) => {
      void notify([addr], { title: `${MEDALS[i]}!`, body: `Cup #${tournamentId}: your prize was paid straight to your wallet. 🎉`, url: `/tournament/${tournamentId}` });
    });
  } catch (e: any) {
    const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
    await db.from("tournaments").update({ settle_error }).eq("id", tournamentId);
  }
}

/* ----------------------- Whot survival table (format 'table') ------------ */

// One board for the whole field; lives in `matches` at slot 9.
export const TABLE_SLOT = 9;
export const tableMatchId = (tournamentId: number) => slotId(tournamentId, TABLE_SLOT);

/** Once the escrow is full: deal one Whot table for everybody. */
export async function seedTable(db: SupabaseClient, t: any) {
  const id = tableMatchId(t.id);
  const { data: existing } = await db.from("matches").select("id").eq("id", id).maybeSingle();
  if (existing) return; // already dealt (idempotent)
  const { data: players } = await db.from("tournament_players").select("address").eq("tournament_id", t.id);
  const field = drawOrder((players ?? []).map((p: any) => p.address.toLowerCase()), t.seed);
  if (field.length < 3) return;
  const { pub, priv } = splitWhot(newWhotTable(field));
  const { error: mErr } = await db.from("matches").upsert(
    {
      id,
      game: "whot",
      chain_id: t.chain_id,
      stake: "0",
      creator: field[0],
      opponent: field[1], // schema needs two seats; the real seating is state.order
      status: "active",
      state: pub,
      turn: pub.turn,
      tournament_id: t.id,
      bracket_slot: TABLE_SLOT,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (mErr) throw mErr;
  const { error: pErr } = await db.from("match_private").upsert({ match_id: id, state: priv }, { onConflict: "match_id" });
  if (pErr) throw pErr;
  void notify(field, {
    title: "The table is set! 🃏",
    body: `Cup #${t.id}: ${field.length} players, one board. First to finish takes the crown.`,
    url: `/tournament/${t.id}`,
  });
}

/** Pay the survival table's podium from the tournament escrow. */
export async function settleTable(db: SupabaseClient, tournamentId: number, ranking: string[]) {
  const { data: t } = await db.from("tournaments").select("*").eq("id", tournamentId).maybeSingle();
  if (!t || t.status === "settled" || t.status === "cancelled") return;
  const top3 = ranking.slice(0, 3);
  if (top3.length < 3) return;
  await db.from("tournaments").update({ status: "settling", winners: top3, settle_error: null }).eq("id", tournamentId);
  if (!relayerConfigured()) return;
  try {
    const tx = await settleRanking(BigInt(tournamentId), top3, Number(t.chain_id));
    await db.from("tournaments").update({ status: "settled", settle_tx: tx, settle_error: null }).eq("id", tournamentId);
    const MEDALS = ["🥇 Champion", "🥈 2nd place", "🥉 3rd place"];
    top3.forEach((addr, i) => {
      void notify([addr], { title: `${MEDALS[i]}!`, body: `Cup #${tournamentId}: your prize was paid straight to your wallet. 🎉`, url: `/tournament/${tournamentId}` });
    });
  } catch (e: any) {
    const settle_error = String(e?.shortMessage ?? e?.message ?? "settle failed").slice(0, 300);
    await db.from("tournaments").update({ settle_error }).eq("id", tournamentId);
  }
}

/**
 * Force-resolve a sub-match nobody is finishing (both sides idle long past the
 * turn-forfeit window): the player to move loses — same rule the per-turn
 * forfeit enforces, applied by the field instead of the opponent.
 */
export async function forceResolveStale(db: SupabaseClient, tournamentId: number, staleMs: number) {
  const { data: subs } = await db.from("matches").select("*").eq("tournament_id", tournamentId).eq("status", "active");
  let changed = false;
  for (const m of subs ?? []) {
    const idle = Date.now() - new Date(m.updated_at).getTime();
    if (idle < staleMs) continue;
    const toMove = String(m.turn ?? (m.state as any)?.turn ?? "").toLowerCase();
    const pair = [m.creator, m.opponent].map((x: string) => x.toLowerCase());
    const winner = pair.find((x) => x !== toMove) ?? pair[0];
    await db.from("matches").update({ status: "settled", winner, settle_error: null }).eq("id", m.id);
    changed = true;
  }
  if (changed) await advanceBracket(db, tournamentId);
  return changed;
}
