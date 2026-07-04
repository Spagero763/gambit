"use client";

import { useEffect, useRef, useState } from "react";
import {
  Footprints, Medal, Repeat, Target, Flame, Zap, Sparkles, TrendingUp, Gem, Crown, Shield, Trophy,
  type LucideIcon,
} from "lucide-react";
import { Progress, levelInfo, loadProgress } from "@/lib/progress";

/**
 * Achievements — long-term goals beyond the daily loop. Derived entirely from
 * the progression we already track (games played, wins, streak, level), so
 * there's no schema and no new data: they just light up as you play. Icons are
 * clean vector marks (no emoji) so the app reads premium, not toy-like.
 */
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  tier: "bronze" | "silver" | "gold";
  /** current numeric progress + the goal, from a Progress snapshot */
  measure: (p: Progress) => { value: number; goal: number };
}

const lvl = (p: Progress) => levelInfo(p.xp).level;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-game", name: "First Steps", desc: "Play your first match", icon: Footprints, tier: "bronze", measure: (p) => ({ value: p.played, goal: 1 }) },
  { id: "first-win", name: "Winner", desc: "Win your first match", icon: Medal, tier: "bronze", measure: (p) => ({ value: p.wins, goal: 1 }) },
  { id: "play-25", name: "Regular", desc: "Play 25 matches", icon: Repeat, tier: "bronze", measure: (p) => ({ value: p.played, goal: 25 }) },
  { id: "win-10", name: "Sharpshooter", desc: "Win 10 matches", icon: Target, tier: "silver", measure: (p) => ({ value: p.wins, goal: 10 }) },
  { id: "streak-3", name: "On a Roll", desc: "Reach a 3-day streak", icon: Flame, tier: "bronze", measure: (p) => ({ value: p.streak, goal: 3 }) },
  { id: "streak-7", name: "Committed", desc: "Reach a 7-day streak", icon: Zap, tier: "silver", measure: (p) => ({ value: p.streak, goal: 7 }) },
  { id: "streak-30", name: "Unstoppable", desc: "Reach a 30-day streak", icon: Sparkles, tier: "gold", measure: (p) => ({ value: p.streak, goal: 30 }) },
  { id: "level-5", name: "Rising", desc: "Reach level 5", icon: TrendingUp, tier: "bronze", measure: (p) => ({ value: lvl(p), goal: 5 }) },
  { id: "level-10", name: "Seasoned", desc: "Reach level 10", icon: Gem, tier: "silver", measure: (p) => ({ value: lvl(p), goal: 10 }) },
  { id: "level-20", name: "Elite", desc: "Reach level 20", icon: Crown, tier: "gold", measure: (p) => ({ value: lvl(p), goal: 20 }) },
  { id: "play-100", name: "Centurion", desc: "Play 100 matches", icon: Shield, tier: "silver", measure: (p) => ({ value: p.played, goal: 100 }) },
  { id: "win-50", name: "Champion", desc: "Win 50 matches", icon: Trophy, tier: "gold", measure: (p) => ({ value: p.wins, goal: 50 }) },
];

export const TIER_COLOR: Record<Achievement["tier"], string> = {
  bronze: "#c08457",
  silver: "#cbd0db",
  gold: "#e3b341",
};

export function isUnlocked(a: Achievement, p: Progress) {
  const { value, goal } = a.measure(p);
  return value >= goal;
}

const SEEN_KEY = "gambit:ach:seen";
function loadSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveSeen(ids: string[]) {
  if (typeof window !== "undefined") localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
}

/**
 * Watches progress and surfaces achievements that JUST unlocked (so we can
 * celebrate them once). First load seeds "seen" silently so we don't spam a
 * returning player with their whole history.
 */
export function useNewAchievements(p: Progress): { newly: Achievement[]; dismiss: () => void } {
  const [newly, setNewly] = useState<Achievement[]>([]);
  const seededRef = useRef(false);

  useEffect(() => {
    // Seed the baseline from the REAL stored progress (read synchronously), not
    // the default snapshot the hook starts with — otherwise everything a
    // returning player has already earned would fire as "new" on first load.
    if (!seededRef.current) {
      seededRef.current = true;
      const real = loadProgress();
      const already = ACHIEVEMENTS.filter((a) => isUnlocked(a, real)).map((a) => a.id);
      saveSeen(Array.from(new Set([...loadSeen(), ...already])));
      return;
    }
    const seen = loadSeen();
    const unlockedNow = ACHIEVEMENTS.filter((a) => isUnlocked(a, p)).map((a) => a.id);
    const fresh = unlockedNow.filter((id) => !seen.includes(id));
    if (fresh.length) {
      saveSeen(Array.from(new Set([...seen, ...unlockedNow])));
      setNewly((cur) => [...cur, ...ACHIEVEMENTS.filter((a) => fresh.includes(a.id) && !cur.some((c) => c.id === a.id))]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.played, p.wins, p.streak, p.xp]);

  return { newly, dismiss: () => setNewly((cur) => cur.slice(1)) };
}
