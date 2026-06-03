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
  art: "chess" | "xo" | "snakes" | "blocks" | "whot"; // key for the cover/icon art
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
    art: "chess",
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
    art: "xo",
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
    art: "snakes",
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
    art: "blocks",
  },
  {
    slug: "whot",
    name: "Naija Whot",
    tagline: "Call your shape. Shed your hand.",
    description: "The classic shape-and-number card game. Match, hit with specials, call a shape on Whot, and empty your hand first.",
    mode: "1v1",
    status: "live",
    minStake: 0.25,
    players: 187,
    accent: "violet",
    art: "whot",
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
