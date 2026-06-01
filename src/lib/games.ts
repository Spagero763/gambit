export type GameMode = "1v1" | "solo" | "tournament";
export type GameStatus = "live" | "soon";

export interface Game {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  mode: GameMode;
  status: GameStatus;
  minStake: number; // in cUSD
  players: number; // live players, mock for now
  accent: "violet" | "teal" | "amber" | "rose";
  glyph: string; // mark used in the card art
}

export const GAMES: Game[] = [
  {
    slug: "chess",
    name: "Chess",
    tagline: "Outthink. Outlast.",
    description: "1v1 with a clock. Read the board, make your move, take the pot.",
    mode: "1v1",
    status: "live",
    minStake: 0.5,
    players: 128,
    accent: "violet",
    glyph: "♞",
  },
  {
    slug: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    tagline: "Thirty seconds. One winner.",
    description: "Fast rounds against a perfect engine. The quickest way in.",
    mode: "1v1",
    status: "live",
    minStake: 0.1,
    players: 214,
    accent: "teal",
    glyph: "✕",
  },
  {
    slug: "snakes",
    name: "Snakes & Ladders",
    tagline: "Climb fast. Mind the bite.",
    description: "A 1v1 dice race up the board. Ladders lift you, snakes drag you down.",
    mode: "1v1",
    status: "live",
    minStake: 0.25,
    players: 173,
    accent: "amber",
    glyph: "🪜",
  },
  {
    slug: "blocks",
    name: "Block Blitz",
    tagline: "Stack. Clear. Combo.",
    description: "Drop shapes on an 8x8 grid, clear lines, chain combos. One wrong fit ends it.",
    mode: "solo",
    status: "live",
    minStake: 0.25,
    players: 96,
    accent: "rose",
    glyph: "▦",
  },
  {
    slug: "runner",
    name: "Dash Runner",
    tagline: "Three lanes. No brakes.",
    description: "Dodge, jump and slide down the line. The longer you last, the bigger the score.",
    mode: "tournament",
    status: "live",
    minStake: 0.25,
    players: 142,
    accent: "violet",
    glyph: "🏃",
  },
];

export const accentMap: Record<
  Game["accent"],
  {
    text: string;
    ring: string;
    glow: string;
    dot: string;
    grad: string; // gradient stops for art
    hex: string;
  }
> = {
  violet: {
    text: "text-violet-bright",
    ring: "ring-violet/40",
    glow: "shadow-glow",
    dot: "bg-violet",
    grad: "from-violet/40 to-violet-deep/10",
    hex: "#8b7dff",
  },
  teal: {
    text: "text-teal",
    ring: "ring-teal/40",
    glow: "shadow-glow-teal",
    dot: "bg-teal",
    grad: "from-teal/40 to-teal-deep/10",
    hex: "#27e1a6",
  },
  amber: {
    text: "text-amber",
    ring: "ring-amber/40",
    glow: "shadow-glow",
    dot: "bg-amber",
    grad: "from-amber/40 to-amber/5",
    hex: "#ffc15e",
  },
  rose: {
    text: "text-rose",
    ring: "ring-rose/40",
    glow: "shadow-glow",
    dot: "bg-rose",
    grad: "from-rose/40 to-rose/5",
    hex: "#ff6b9a",
  },
};
