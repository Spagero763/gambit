"use client";

/** Submit a free-play score to the weekly events board (best-effort, fire-and-forget). */
export async function submitScore(address: string | undefined, game: string, score: number): Promise<void> {
  if (!address || !Number.isFinite(score)) return;
  try {
    await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, game, score }),
    });
  } catch {
    /* ignore — scores are non-critical */
  }
}

/** Start of the current weekly contest (Monday 00:00 UTC). */
export function weekStart(d = new Date()): Date {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}
export function weekEnd(d = new Date()): Date {
  return new Date(weekStart(d).getTime() + 7 * 86400_000);
}
