// Weekly Cup calendar — shared by client and server so both derive the same
// week, board seed and deadline with no coordination. Weeks run Monday 00:00
// UTC → Monday 00:00 UTC.

const WEEK_MS = 7 * 24 * 3600 * 1000;
// Monday 1970-01-05 00:00 UTC (the Unix epoch was a Thursday).
const EPOCH_MONDAY = 4 * 24 * 3600 * 1000;

/** Sequential week number since the epoch Monday. */
export function weekIndex(now = Date.now()): number {
  return Math.floor((now - EPOCH_MONDAY) / WEEK_MS);
}

/** Storage key for a week, e.g. "w2947". */
export const weekKey = (i: number) => `w${i}`;
export const weekOf = (key: string) => Number(key.slice(1));

export const weekStart = (i: number) => EPOCH_MONDAY + i * WEEK_MS;
export const weekEnd = (i: number) => weekStart(i) + WEEK_MS;

/** Deterministic board seed for the week — everyone plays the same board. */
export function weekSeed(i: number): number {
  const s = (i * 2654435761) % 0x7fffffff; // Knuth multiplicative hash
  return s > 0 ? s : 1;
}

/** Prize split for 1st/2nd/3rd, mirroring the staked cups' 50/30/20. */
export const CUP_SPLIT = [0.5, 0.3, 0.2] as const;
