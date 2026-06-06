// Server-authoritative Naija Whot for staked 1v1. The full state (hands +
// market) lives only here / in match_private; clients receive a redacted view.
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
  order: [string, string];
  turn: string;
}

/** Public, non-secret slice safe to store in the realtime matches row. */
export interface WhotPublic {
  top: Card | null;
  active: Shape;
  pending: WhotPending | null;
  counts: Record<string, number>;
  order: [string, string];
  turn: string;
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

export function newWhot(creator: string, opponent: string): WhotFull {
  const c = creator.toLowerCase();
  const o = opponent.toLowerCase();
  const rng = rngFrom((Date.now() % 1_000_000) + 17);
  const deck = shuffle(buildDeck(), rng);
  const hands: Record<string, Card[]> = { [c]: [], [o]: [] };
  let idx = 0;
  for (let k = 0; k < 6; k++) {
    hands[c].push(deck[idx++]);
    hands[o].push(deck[idx++]);
  }
  let rest = deck.slice(idx);
  let startI = rest.findIndex((card) => card.shape !== "whot" && !SPECIALS.has(card.num));
  if (startI < 0) startI = 0;
  const start = rest[startI];
  rest = rest.filter((_, i) => i !== startI);
  return { hands, market: rest, pile: [start], active: start.shape, pending: null, order: [c, o], turn: c };
}

export function splitWhot(full: WhotFull): { pub: WhotPublic; priv: WhotPrivate } {
  return {
    pub: {
      top: full.pile[full.pile.length - 1] ?? null,
      active: full.active,
      pending: full.pending,
      counts: { [full.order[0]]: full.hands[full.order[0]].length, [full.order[1]]: full.hands[full.order[1]].length },
      order: full.order,
      turn: full.turn,
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
  };
}

export interface WhotOutcome {
  full: WhotFull;
  finished: boolean;
  winner: string | null;
  draw: boolean;
}

const other = (full: WhotFull, addr: string) => full.order.find((a) => a !== addr) ?? addr;

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

const cont = (full: WhotFull): WhotOutcome => ({ full, finished: false, winner: null, draw: false });
const win = (full: WhotFull, addr: string): WhotOutcome => ({ full, finished: true, winner: addr, draw: false });

export function applyWhotPlay(full: WhotFull, player: string, cardId: string, called?: Shape): WhotOutcome {
  const addr = player.toLowerCase();
  if (full.turn !== addr) throw new Error("Not your turn");
  if (!(addr in full.hands)) throw new Error("Not a player");
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
    if (full.hands[addr].length === 0) return win(full, addr);
    full.pending = { amount: full.pending.amount + (full.pending.num === 2 ? 2 : 3), num: full.pending.num };
    full.turn = other(full, addr);
    return cont(full);
  }

  if (!isLegal(card, top?.num ?? 0, full.active)) throw new Error("Illegal card");
  if (card.shape === "whot" && !called) throw new Error("Call a shape");

  full.hands[addr] = hand.filter((c) => c.id !== cardId);
  full.pile.push(card);
  full.active = card.shape === "whot" ? called ?? "circle" : card.shape;
  if (full.hands[addr].length === 0) return win(full, addr);

  if (SPECIALS.has(card.num)) {
    // 1 (hold on) and 8 (suspension, skips the only opponent) => play again
    if (card.num === 1 || card.num === 8) {
      full.turn = addr;
      return cont(full);
    }
    if (card.num === 14) {
      // general market: opponent draws one, you play again
      const opp = other(full, addr);
      full.hands[opp] = [...full.hands[opp], ...drawCards(full, 1)];
      full.turn = addr;
      return cont(full);
    }
    if (card.num === 2) {
      full.pending = { amount: 2, num: 2 };
      full.turn = other(full, addr);
      return cont(full);
    }
    if (card.num === 5) {
      full.pending = { amount: 3, num: 5 };
      full.turn = other(full, addr);
      return cont(full);
    }
  }

  full.turn = other(full, addr);
  return cont(full);
}

export function applyWhotDraw(full: WhotFull, player: string): WhotOutcome {
  const addr = player.toLowerCase();
  if (full.turn !== addr) throw new Error("Not your turn");
  if (!(addr in full.hands)) throw new Error("Not a player");
  if (full.pending) {
    full.hands[addr] = [...full.hands[addr], ...drawCards(full, full.pending.amount)];
    full.pending = null;
  } else {
    full.hands[addr] = [...full.hands[addr], ...drawCards(full, 1)];
  }
  full.turn = other(full, addr);
  return cont(full);
}
