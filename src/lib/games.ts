export type GameMode = "1v1" | "solo" | "tournament";
export type GameStatus = "live" | "soon";

export interface Game {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  mode: GameMode;
  status: GameStatus;
  minStake: number;
  players: number;
  accent: "violet" | "teal" | "amber" | "rose";
  art: "chess" | "xo" | "snakes" | "blocks" | "whot";
}

export const GAMES: Game[] = [
  {
    slug: "chess",
    name: "Chess",
    tagline: "Classic. Timed. Head to head.",
    description: "1 v 1 on an 8 by 8 board with a clock. No luck, just the board.",
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
    tagline: "Simple board. Quick rounds.",
    description: "Three in a row wins. Fast games against an engine that plays back.",
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
    tagline: "Roll. Climb. Watch the bite.",
    description: "Race to square 100 with a die. Ladders lift, snakes drop, first to the top wins.",
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
    tagline: "Fit the pieces. Clear the board.",
    description: "Drop blocks onto an 8 by 8 grid, fill rows and columns to clear them, chain clears for a rising multiplier. Ends when nothing fits.",
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
    tagline: "Five shapes, one deck, no mercy.",
    description: "The shape-and-number card game. Match, hit with specials and shed every card before the table does.",
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
    grad: string;
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
