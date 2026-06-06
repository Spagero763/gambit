"use client";

import { useEffect, useState } from "react";

/**
 * Local progression: XP + levels, a daily streak, and rotating daily quests.
 * This is the retention engine — reasons to come back every day. Free play
 * counts, so no wallet is required. Stored in localStorage; later we can sync
 * to Supabase for cross-device + a global XP leaderboard.
 */

export type GameResult = "win" | "lose" | "draw";

export interface Quest {
  id: string;
  label: string;
  type: "play" | "win";
  game?: string; // restrict to a game slug
  goal: number;
  progress: number;
  claimed: boolean;
  xp: number;
}

export interface Progress {
  xp: number;
  streak: number;
  lastPlayed: string; // YYYY-MM-DD
  questDate: string; // day the current quests belong to
  quests: Quest[];
  played: number;
  wins: number;
}

const KEY = "gambit:progress";

const QUEST_POOL: Omit<Quest, "progress" | "claimed">[] = [
  { id: "play3", label: "Play 3 matches", type: "play", goal: 3, xp: 60 },
  { id: "play5", label: "Play 5 matches", type: "play", goal: 5, xp: 90 },
  { id: "win2", label: "Win 2 matches", type: "win", goal: 2, xp: 80 },
  { id: "win3", label: "Win 3 matches", type: "win", goal: 3, xp: 120 },
  { id: "win_chess", label: "Win a chess game", type: "win", game: "chess", goal: 1, xp: 70 },
  { id: "win_whot", label: "Win a Whot round", type: "win", game: "whot", goal: 1, xp: 70 },
  { id: "win_ttt", label: "Win at tic-tac-toe", type: "win", game: "tic-tac-toe", goal: 1, xp: 50 },
  { id: "play_snakes", label: "Roll in Snakes & Ladders", type: "play", game: "snakes", goal: 1, xp: 40 },
  { id: "play_blocks", label: "Play a round of Block Blitz", type: "play", game: "blocks", goal: 1, xp: 40 },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayOf(d: string): string {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministically pick 3 quests for a given day. */
function questsForDay(day: string): Quest[] {
  const pool = [...QUEST_POOL];
  let seed = hash(day);
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const picked: Quest[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const [q] = pool.splice(Math.floor(rng() * pool.length), 1);
    picked.push({ ...q, progress: 0, claimed: false });
  }
  return picked;
}

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: 0,
  lastPlayed: "",
  questDate: "",
  quests: [],
  played: 0,
  wins: 0,
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  let p: Progress;
  try {
    const raw = localStorage.getItem(KEY);
    p = raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : { ...DEFAULT_PROGRESS };
  } catch {
    p = { ...DEFAULT_PROGRESS };
  }
  // refresh quests if it's a new day
  const t = today();
  if (p.questDate !== t) {
    p.quests = questsForDay(t);
    p.questDate = t;
  }
  return p;
}

function save(p: Progress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("gambit:progress", { detail: p }));
}

/** Level math: each level costs ~35% more XP than the last. */
export function levelInfo(xp: number) {
  let level = 1;
  let need = 100;
  let floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level += 1;
    need = Math.round(need * 1.35);
  }
  return { level, into: xp - floor, span: need, pct: Math.round(((xp - floor) / need) * 100) };
}

/** Record a finished game. Call from each game on game-over. */
export function recordResult(game: string, result: GameResult): Progress {
  const p = loadProgress();
  const t = today();

  // streak
  if (p.lastPlayed !== t) {
    p.streak = p.lastPlayed === yesterdayOf(t) ? p.streak + 1 : 1;
    p.lastPlayed = t;
  }

  p.played += 1;
  const won = result === "win";
  if (won) p.wins += 1;
  p.xp += 10 + (won ? 25 : 0);

  // quest progress
  for (const q of p.quests) {
    if (q.claimed) continue;
    if (q.game && q.game !== game) continue;
    if (q.type === "win" && !won) continue;
    if (q.progress < q.goal) q.progress = Math.min(q.goal, q.progress + 1);
  }

  save(p);
  return p;
}

/** Merge server-side progression into local (keeps the higher of each value). */
export function hydrateProgress(server: {
  xp?: number;
  streak?: number;
  lastPlayed?: string;
  played?: number;
  wins?: number;
}): Progress {
  const p = loadProgress();
  if (typeof server.xp === "number") p.xp = Math.max(p.xp, server.xp);
  if (typeof server.streak === "number") p.streak = Math.max(p.streak, server.streak);
  if (typeof server.played === "number") p.played = Math.max(p.played, server.played);
  if (typeof server.wins === "number") p.wins = Math.max(p.wins, server.wins);
  if (server.lastPlayed && server.lastPlayed > (p.lastPlayed || "")) p.lastPlayed = server.lastPlayed;
  save(p);
  return p;
}

export function claimQuest(id: string): Progress {
  const p = loadProgress();
  const q = p.quests.find((x) => x.id === id);
  if (q && !q.claimed && q.progress >= q.goal) {
    q.claimed = true;
    p.xp += q.xp;
    save(p);
  }
  return p;
}

/** Reactive hook, mirrors useSettings. */
export function useProgress(): Progress {
  const [p, setP] = useState<Progress>(DEFAULT_PROGRESS);
  useEffect(() => {
    setP(loadProgress());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as Progress | undefined;
      setP(detail ?? loadProgress());
    };
    window.addEventListener("gambit:progress", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gambit:progress", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return p;
}
