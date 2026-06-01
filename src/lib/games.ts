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
  glyph: string; // simple emoji/unicode mark used in the card art
}

export const GAMES: Game[] = [
  {
    slug: "chess",
    name: "Chess",
    tagline: "Outthink. Outlast.",
    description: "Classic 1v1 with a clock. Read the board, make your move, take the pot.",
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
    description: "Fast best-of rounds. The quickest way into a match.",
    mode: "1v1",
    status: "live",
    minStake: 0.1,
    players: 214,
    accent: "teal",
    glyph: "✕",
  },
  {
    slug: "snake",
    name: "Snake",
    tagline: "Grow or get cornered.",
    description: "Climb the daily board. Weekly pools for the top of the chain.",
    mode: "tournament",
    status: "soon",
    minStake: 0.25,
    players: 86,
    accent: "amber",
    glyph: "⟿",
  },
  {
    slug: "brick-breaker",
    name: "Brick Breaker",
    tagline: "One ball. No mercy.",
    description: "Survival runs against a daily challenge ladder.",
    mode: "solo",
    status: "soon",
    minStake: 0.25,
    players: 51,
    accent: "rose",
    glyph: "▟",
  },
  {
    slug: "runner",
    name: "Endless Runner",
    tagline: "Never stop moving.",
    description: "Score-chase weekly tournaments. The longer you last, the bigger the cut.",
    mode: "tournament",
    status: "soon",
    minStake: 0.25,
    players: 73,
    accent: "violet",
    glyph: "➤",
  },
];

export const accentMap: Record<
  Game["accent"],
  { text: string; ring: string; glow: string; dot: string; from: string }
> = {
  violet: {
    text: "text-violet-bright",
    ring: "ring-violet/40",
    glow: "shadow-glow",
    dot: "bg-violet",
    from: "from-violet/25",
  },
  teal: {
    text: "text-teal",
    ring: "ring-teal/40",
    glow: "shadow-glow-teal",
    dot: "bg-teal",
    from: "from-teal/25",
  },
  amber: {
    text: "text-amber",
    ring: "ring-amber/40",
    glow: "shadow-glow",
    dot: "bg-amber",
    from: "from-amber/25",
  },
  rose: {
    text: "text-rose",
    ring: "ring-rose/40",
    glow: "shadow-glow",
    dot: "bg-rose",
    from: "from-rose/25",
  },
};
