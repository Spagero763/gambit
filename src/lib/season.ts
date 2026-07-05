"use client";

// Monthly season on top of the lifetime rank ladder: your rank never resets
// (prestige is permanent), but each calendar month opens a fresh XP season —
// a reason to come back on the 1st and climb again. Season XP is measured
// against a baseline snapshot of your XP taken the first time you show up in
// a given month. No schema, no server: it lives beside the rest of the local
// progression and syncs the same way.

const KEY = "gambit:season";

export const seasonKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export const seasonName = (d = new Date()) =>
  d.toLocaleString("en", { month: "long", timeZone: "UTC" });

/** Days until the next season (1st of next month, UTC). */
export function seasonDaysLeft(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 86_400_000));
}

/** XP earned this season: current XP minus the baseline captured on your first
 *  visit of the month. Baselines self-heal if XP was hydrated from the server. */
export function seasonXp(currentXp: number): number {
  if (typeof window === "undefined") return 0;
  const k = seasonKey();
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { key: string; baseline: number }) : null;
    if (!saved || saved.key !== k) {
      localStorage.setItem(KEY, JSON.stringify({ key: k, baseline: currentXp }));
      return 0;
    }
    // server hydration can only raise XP; never let the baseline exceed it
    if (saved.baseline > currentXp) {
      localStorage.setItem(KEY, JSON.stringify({ key: k, baseline: currentXp }));
      return 0;
    }
    return currentXp - saved.baseline;
  } catch {
    return 0;
  }
}
