import { levelInfo } from "@/lib/progress";

/**
 * Rank ladder — a named prestige tier derived entirely from the XP/level a
 * player already earns (no new data, no schema). Turns a bare "Lv 6" into
 * status they can chase and show off: Rookie → Bronze → Silver → Gold →
 * Platinum → Diamond → Legend. Retention + a premium, shareable identity.
 */
export interface Rank {
  name: string;
  color: string; // badge accent
  glow: string; // soft tint for cards / glows
  minLevel: number;
  index: number; // 0-based tier
}

const LADDER: Omit<Rank, "index">[] = [
  { name: "Rookie", color: "#94a3b8", glow: "rgba(148,163,184,0.16)", minLevel: 1 },
  { name: "Bronze", color: "#c08457", glow: "rgba(192,132,87,0.18)", minLevel: 3 },
  { name: "Silver", color: "#cbd0db", glow: "rgba(203,208,219,0.18)", minLevel: 6 },
  { name: "Gold", color: "#e3b341", glow: "rgba(227,179,65,0.20)", minLevel: 10 },
  { name: "Platinum", color: "#5eead4", glow: "rgba(94,234,212,0.18)", minLevel: 15 },
  { name: "Diamond", color: "#7cc4fb", glow: "rgba(124,196,251,0.20)", minLevel: 21 },
  { name: "Legend", color: "#c084fc", glow: "rgba(192,132,252,0.22)", minLevel: 30 },
];

export interface RankState extends Rank {
  next?: Rank;
  /** progress 0..1 from the start of this rank to the next (by level + in-level XP). */
  progress: number;
}

export function rankForLevel(level: number, xpPct = 0): RankState {
  let idx = 0;
  for (let i = 0; i < LADDER.length; i++) if (level >= LADDER[i].minLevel) idx = i;
  const cur: Rank = { ...LADDER[idx], index: idx };
  const next = idx < LADDER.length - 1 ? { ...LADDER[idx + 1], index: idx + 1 } : undefined;

  let progress = 1;
  if (next) {
    const span = next.minLevel - cur.minLevel;
    const into = level - cur.minLevel + xpPct / 100;
    progress = Math.max(0, Math.min(1, into / span));
  }
  return { ...cur, next, progress };
}

/** Rank from raw XP — the common entry point. */
export function rankForXp(xp: number): RankState {
  const info = levelInfo(xp);
  return rankForLevel(info.level, info.pct);
}
