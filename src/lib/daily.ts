"use client";

// The Daily Challenge: one seeded Block Blitz board per UTC day, the same for
// everyone on earth. Your FIRST finished run is your result for the day (like
// Wordle); replays are practice. Result + streak live in localStorage.

const DAY_MS = 24 * 3600 * 1000;
// Day #1 = 1 July 2026 UTC (launch day).
const EPOCH = Date.UTC(2026, 6, 1);

export function dayNumber(now = Date.now()): number {
  return Math.floor((now - EPOCH) / DAY_MS) + 1;
}

/** Everyone plays this exact board today. */
export function daySeed(n: number): number {
  const s = (n * 1000003) % 0x7fffffff; // deterministic, spread out
  return s > 0 ? s : 1;
}

/** ms until the next board (midnight UTC). */
export function msToNextBoard(now = Date.now()): number {
  return DAY_MS - ((now - EPOCH) % DAY_MS);
}

export interface DailyResult {
  score: number;
  at: number;
}

const key = (n: number) => `gambit:daily:${n}`;
const STREAK_KEY = "gambit:daily:streak";

/** Today's locked-in result, if the player already finished a run. */
export function dailyResult(n: number): DailyResult | null {
  try {
    const raw = localStorage.getItem(key(n));
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

/** Current streak (consecutive days with a finished run, ending today or yesterday). */
export function dailyStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { streak, day } = JSON.parse(raw) as { streak: number; day: number };
    const today = dayNumber();
    return day === today || day === today - 1 ? streak : 0; // broken streaks read as 0
  } catch {
    return 0;
  }
}

/** Record the first finished run of the day. Returns the (possibly new) streak. */
export function recordDaily(n: number, score: number): { result: DailyResult; streak: number; first: boolean } {
  const existing = dailyResult(n);
  if (existing) return { result: existing, streak: dailyStreak(), first: false };
  const result: DailyResult = { score, at: Date.now() };
  let streak = 1;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as { streak: number; day: number };
      streak = prev.day === n - 1 ? prev.streak + 1 : prev.day === n ? prev.streak : 1;
    }
    localStorage.setItem(key(n), JSON.stringify(result));
    localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, day: n }));
  } catch {
    /* private mode — the run still counts on screen */
  }
  return { result, streak, first: true };
}

/** The spoiler-free share text (no board detail, just the flex). */
export function shareText(n: number, score: number, streak: number): string {
  const fire = streak > 1 ? `\n🔥 ${streak} day streak` : "";
  return `🎮 Gambit Daily #${n}\n🧩 ${score.toLocaleString()} points${fire}\nSame board for everyone. Think you'd beat it?`;
}
