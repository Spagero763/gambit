// Server-authoritative Naija Whot. The full state (hands + market) lives only
// here / in match_private; clients receive a redacted view.
//
// One engine for both formats:
//   1v1     — order of two; first to empty their hand wins the pot.
//   table   — 3-8 players around one board; as players finish they take
//             1st/2nd/3rd (the survival format) and the rest keep playing
//             until the podium is decided.
import { Card, Shape, buildDeck, shuffle, isLegal, activeSpecials, DEFAULT_RULES } from "@/lib/games/whot";

const SPECIALS = activeSpecials(DEFAULT_RULES); // {1,2,5,8,14}

export interface WhotPending {
  amount: number;
  num: number;
}

export interface WhotFull {
  hands: Record<string, Card[]>;
  market: Card[];
  pile: Card[];
  active: Shape;
  pending: WhotPending | null;
  order: string[];
  turn: string;
  finished: string[]; // placement order — players who emptied their hand
}

/** Public, non-secret slice safe to store in the realtime matches row. */
export interface WhotPublic {
  top: Card | null;
  active: Shape;
  pending: WhotPending | null;
  counts: Record<string, number>;
  order: string[];
  turn: string;
  finished: string[];
}

/** Secret slice — match_private only. */
export interface WhotPrivate {
  hands: Record<string, Card[]>;
  market: Card[];
  pile: Card[];
}

function rngFrom(seed: number) {
  let s = seed % 0x7fffffff || 1;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** Deal a table of 2-8 players. Hand size shrinks so big tables fit the deck. */
export function newWhotTable(players: string[]): WhotFull {
  const order = players.map((p) => p.toLowerCase());
  const rng = rngFrom((Date.now() % 1_000_000) + 17);
  const deck = shuffle(buildDeck(), rng);
  const handSize = order.length <= 4 ? 6 : order.length <= 6 ? 5 : 4;
  const hands: Record<string, Card[]> = Object.fromEntries(order.map((p) => [p, []]));
  let idx = 0;
  for (let k = 0; k < handSize; k++) {
    for (const p of order) hands[p].push(deck[idx++]);
  }
  let rest = deck.slice(idx);
  let startI = rest.findIndex((card) => card.shape !== "whot" && !SPECIALS.has(card.num));
  if (startI < 0) startI = 0;
  const start = rest[startI];
  rest = rest.filter((_, i) => i !== startI);
  return { hands, market: rest, pile: [start], active: start.shape, pending: null, order, turn: order[0], finished: [] };
}

export function newWhot(creator: string, opponent: string): WhotFull {
  return newWhotTable([creator, opponent]);
}

export function splitWhot(full: WhotFull): { pub: WhotPublic; priv: WhotPrivate } {
  return {
    pub: {
      top: full.pile[full.pile.length - 1] ?? null,
      active: full.active,
      pending: full.pending,
      counts: Object.fromEntries(full.order.map((p) => [p, full.hands[p]?.length ?? 0])),
      order: full.order,
      turn: full.turn,
      finished: full.finished ?? [],
    },
    priv: { hands: full.hands, market: full.market, pile: full.pile },
  };
}

export function mergeWhot(pub: WhotPublic, priv: WhotPrivate): WhotFull {
  return {
    hands: priv.hands,
    market: priv.market,
    pile: priv.pile,
    active: pub.active,
    pending: pub.pending,
    order: pub.order,
    turn: pub.turn,
    finished: pub.finished ?? [],
  };
}

export interface WhotOutcome {
  full: WhotFull;
  finished: boolean;
  winner: string | null; // 1st place (compat with the 1v1 settle path)
  ranking: string[] | null; // full podium order when the game ends
  draw: boolean;
}

/** Players still holding cards, in seating order. */
const alive = (full: WhotFull) => full.order.filter((p) => !(full.finished ?? []).includes(p));

/** The next still-playing seat after `from` (cyclic). */
function nextActive(full: WhotFull, from: string): string {
  const live = alive(full);
  if (live.length === 0) return from;
  const start = full.order.indexOf(from);
  for (let i = 1; i <= full.order.length; i++) {
    const cand = full.order[(start + i) % full.order.length];
    if (live.includes(cand)) return cand;
  }
  return live[0];
}

/** Draw `count` cards, reshuffling the discard pile back in when the market empties. */
function drawCards(full: WhotFull, count: number): Card[] {
  const taken: Card[] = [];
  const rng = rngFrom(full.market.length * 7 + full.pile.length * 13 + (Date.now() % 1000) + 3);
  for (let i = 0; i < count; i++) {
    if (full.market.length === 0) {
      if (full.pile.length > 1) {
        const keep = full.pile[full.pile.length - 1];
        full.market = shuffle(full.pile.slice(0, -1), rng);
        full.pile = [keep];
      } else break;
    }
    if (full.market.length === 0) break;
    taken.push(full.market.shift()!);
  }
  return taken;
}

const cont = (full: WhotFull): WhotOutcome => ({ full, finished: false, winner: null, ranking: null, draw: false });

/**
 * Mark a player as having emptied their hand. The game ends when only one
 * player still holds cards — the podium is the finish order plus that last
 * player (1v1: just [winner]).
 */
function finishPlayer(full: WhotFull, addr: string): WhotOutcome {
  full.finished = [...(full.finished ?? []), addr];
  const live = alive(full);
  if (live.length <= 1) {
    const ranking = [...full.finished, ...live];
    return { full, finished: true, winner: ranking[0] ?? null, ranking, draw: false };
  }
  // table plays on — pass the turn along
  full.pending = null; // a finishing special fizzles; the table continues clean
  full.turn = nextActive(full, addr);
  return cont(full);
}

export function applyWhotPlay(full: WhotFull, player: string, cardId: string, called?: Shape): WhotOutcome {
  const addr = player.toLowerCase();
  if (full.turn !== addr) throw new Error("Not your turn");
  if (!(addr in full.hands)) throw new Error("Not a player");
  if ((full.finished ?? []).includes(addr)) throw new Error("You've already finished");
  const hand = full.hands[addr];
  const card = hand.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not in hand");
  const top = full.pile[full.pile.length - 1];

  // a pending pick-two/three: must stack the same number or go to market
  if (full.pending) {
    if (card.num !== full.pending.num) throw new Error("Stack the same number or draw");
    full.hands[addr] = hand.filter((c) => c.id !== cardId);
    full.pile.push(card);
    full.active = card.shape === "whot" ? called ?? "circle" : card.shape;
    if (full.hands[addr].length === 0) return finishPlayer(full, addr);
    full.pending = { amount: full.pending.amount + (full.pending.num === 2 ? 2 : 3), num: full.pending.num };
    full.turn = nextActive(full, addr);
    return cont(full);
  }

  if (!isLegal(card, top?.num ?? 0, full.active)) throw new Error("Illegal card");
  if (card.shape === "whot" && !called) throw new Error("Call a shape");

  full.hands[addr] = hand.filter((c) => c.id !== cardId);
  full.pile.push(card);
  full.active = card.shape === "whot" ? called ?? "circle" : card.shape;
  if (full.hands[addr].length === 0) return finishPlayer(full, addr);

  if (SPECIALS.has(card.num)) {
    if (card.num === 1) {
      // hold on: play again
      full.turn = addr;
      return cont(full);
    }
    if (card.num === 8) {
      // suspension: the next player is skipped (1v1: that's play-again)
      full.turn = nextActive(full, nextActive(full, addr));
      return cont(full);
    }
    if (card.num === 14) {
      // general market: every other live player draws one, you play again
      for (const p of alive(full)) {
        if (p !== addr) full.hands[p] = [...full.hands[p], ...drawCards(full, 1)];
      }
      full.turn = addr;
      return cont(full);
    }
    if (card.num === 2) {
      full.pending = { amount: 2, num: 2 };
      full.turn = nextActive(full, addr);
      return cont(full);
    }
    if (card.num === 5) {
      full.pending = { amount: 3, num: 5 };
      full.turn = nextActive(full, addr);
      return cont(full);
    }
  }

  full.turn = nextActive(full, addr);
  return cont(full);
}

export function applyWhotDraw(full: WhotFull, player: string): WhotOutcome {
  const addr = player.toLowerCase();
  if (full.turn !== addr) throw new Error("Not your turn");
  if (!(addr in full.hands)) throw new Error("Not a player");
  if ((full.finished ?? []).includes(addr)) throw new Error("You've already finished");
  if (full.pending) {
    full.hands[addr] = [...full.hands[addr], ...drawCards(full, full.pending.amount)];
    full.pending = null;
  } else {
    full.hands[addr] = [...full.hands[addr], ...drawCards(full, 1)];
  }
  full.turn = nextActive(full, addr);
  return cont(full);
}
