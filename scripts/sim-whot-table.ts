/**
 * Headless simulation of multiplayer Naija Whot survival tables, driving the
 * REAL server engine (no UI, no chain). Plays thousands of full games with a
 * simple "first legal card, else draw" AI to prove: every game terminates,
 * placements lock in the order players empty their hands, the podium ranking
 * is complete + distinct, and the specials don't deadlock at 3-8 seats.
 *
 * Run: npx tsx scripts/sim-whot-table.ts
 */
import { newWhotTable, applyWhotPlay, applyWhotDraw, splitWhot, mergeWhot, WhotFull } from "../src/lib/server/whot";
import { isLegal } from "../src/lib/games/whot";

/** Mirror the API's store/redact cycle: split to public+private, persist,
 *  reload, merge back. The public slice must never carry anyone's hand. */
function roundTrip(state: WhotFull): WhotFull {
  const { pub, priv } = splitWhot(state);
  if ("hands" in (pub as any)) throw new Error("public slice leaked hands!");
  for (const p of state.order) {
    if ((pub.counts[p] ?? -1) !== state.hands[p].length) throw new Error("public count mismatch");
  }
  return mergeWhot(JSON.parse(JSON.stringify(pub)), JSON.parse(JSON.stringify(priv)));
}

function playOneGame(seats: number): { ranking: string[]; turns: number; finished: string[] } {
  const players = Array.from({ length: seats }, (_, i) => `0xplayer${i}`);
  let state: WhotFull = newWhotTable(players);

  // sanity: everyone got cards, the deck conserved
  const dealt = Object.values(state.hands).reduce((n, h) => n + h.length, 0);
  const total = dealt + state.market.length + state.pile.length;
  if (total !== 54) throw new Error(`deck not conserved at deal: ${total}`);

  let turns = 0;
  while (true) {
    if (++turns > 20000) throw new Error("game did not terminate");
    const cur = state.turn;
    if (!cur || !state.hands[cur]) throw new Error(`bad turn pointer: ${cur}`);
    if ((state.finished ?? []).includes(cur)) throw new Error(`finished player on turn: ${cur}`);

    const hand = state.hands[cur];
    const top = state.pile[state.pile.length - 1];

    // pick a legal card (respecting a pending pick-2/3)
    let pick: { id: string; shape: string } | null = null;
    for (const c of hand) {
      if (state.pending) {
        if (c.num === state.pending.num) { pick = c; break; }
      } else if (isLegal(c, top?.num ?? 0, state.active)) {
        pick = c; break;
      }
    }

    const out = pick
      ? applyWhotPlay(state, cur, pick.id, pick.shape === "whot" ? "circle" : undefined)
      : applyWhotDraw(state, cur);
    // every move goes through the same store/redact cycle the API uses
    state = out.finished ? out.full : roundTrip(out.full);

    // deck must stay conserved every step
    const t2 = Object.values(state.hands).reduce((n, h) => n + h.length, 0) + state.market.length + state.pile.length;
    if (t2 !== 54) throw new Error(`deck not conserved mid-game: ${t2} (turn ${turns})`);

    if (out.finished) return { ranking: out.ranking ?? [], turns, finished: state.finished ?? [] };
  }
}

const SEATS = [2, 3, 4, 5, 6, 7, 8];
const GAMES_PER = 400;
let ok = 0;
const fails: string[] = [];

for (const seats of SEATS) {
  let avgTurns = 0;
  for (let g = 0; g < GAMES_PER; g++) {
    try {
      const r = playOneGame(seats);
      // ranking must be complete and distinct, podium-sized at the front
      const distinct = new Set(r.ranking).size === r.ranking.length;
      if (r.ranking.length !== seats) throw new Error(`ranking len ${r.ranking.length} != ${seats}`);
      if (!distinct) throw new Error("ranking has duplicates");
      // the recorded finish order must be a prefix of the final ranking
      for (let i = 0; i < r.finished.length; i++) {
        if (r.finished[i] !== r.ranking[i]) throw new Error("finish order != ranking prefix");
      }
      avgTurns += r.turns;
      ok++;
    } catch (e: any) {
      fails.push(`${seats}p: ${e.message}`);
    }
  }
  console.log(`${seats} players — ${GAMES_PER} games, avg ${Math.round(avgTurns / GAMES_PER)} turns/game ✓`);
}

console.log(`\n${ok}/${SEATS.length * GAMES_PER} games passed.`);
if (fails.length) {
  console.log("FAILURES (first 10):");
  for (const f of fails.slice(0, 10)) console.log("  -", f);
  process.exit(1);
} else {
  console.log("All multiplayer Whot tables terminate with a valid, complete podium. ✅");
}
