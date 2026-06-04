export type Shape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

export interface Card {
  id: string;
  shape: Shape;
  num: number; // 20 for whot
}

// Verified Nigerian (classic/Taj) Whot deck: 54 cards, no 6 and no 9.
const SUITS: Record<Exclude<Shape, "whot">, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  (Object.keys(SUITS) as Array<Exclude<Shape, "whot">>).forEach((shape) => {
    for (const num of SUITS[shape]) deck.push({ id: `${shape}-${num}`, shape, num });
  });
  for (let i = 0; i < 5; i++) deck.push({ id: `whot-${i}`, shape: "whot", num: 20 });
  return deck; // 54
}

/** Fisher-Yates using an injected rng so shuffles stay deterministic per match. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Legal if it matches the active shape (the called shape when a Whot is on top),
 * matches the top number, or is itself a Whot wild.
 */
export function isLegal(card: Card, topNum: number, activeShape: Shape): boolean {
  if (card.shape === "whot") return true;
  if (activeShape !== "whot" && card.shape === activeShape) return true;
  return card.num === topNum;
}

export const SPECIALS: Record<number, string> = {
  1: "Hold On",
  2: "Pick Two",
  5: "Pick Three",
  8: "Suspension",
  14: "General Market",
  20: "Whot",
};

/** Score of a hand at game end. Star counts double, Whot counts 20. Lower is better. */
export function handScore(hand: Card[]): number {
  return hand.reduce((sum, c) => {
    if (c.shape === "whot") return sum + 20;
    if (c.shape === "star") return sum + c.num * 2;
    return sum + c.num;
  }, 0);
}

export const SHAPE_LABEL: Record<Shape, string> = {
  circle: "Circle",
  triangle: "Triangle",
  cross: "Cross",
  square: "Square",
  star: "Star",
  whot: "Whot",
};

/** House rules a player can toggle before a game. */
export interface WhotRules {
  holdOn: boolean; // 1 = play again
  pickTwo: boolean; // 2 = next draws two (stackable)
  pickThree: boolean; // 5 = next draws three (stackable)
  suspension: boolean; // 8 = skip next
  generalMarket: boolean; // 14 = all others draw one, play again
}

export const DEFAULT_RULES: WhotRules = {
  holdOn: true,
  pickTwo: true,
  pickThree: true,
  suspension: true,
  generalMarket: true,
};

/** The action numbers currently active given a rules config. */
export function activeSpecials(rules: WhotRules): Set<number> {
  const s = new Set<number>();
  if (rules.holdOn) s.add(1);
  if (rules.pickTwo) s.add(2);
  if (rules.pickThree) s.add(5);
  if (rules.suspension) s.add(8);
  if (rules.generalMarket) s.add(14);
  return s;
}

