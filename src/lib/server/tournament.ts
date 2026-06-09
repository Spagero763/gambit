// Server-side tournament helpers. The pot is paid to the top three finishers
// (the contract enforces 50/30/20), so we only ever need the ranking.

export interface TPlayer {
  address: string;
  score: number | null;
}

/** Top three distinct addresses by score (desc), unplayed = lowest, ties broken
 *  deterministically by address so the result is reproducible. */
export function rankTop3(players: TPlayer[]): string[] {
  const sorted = [...players].sort((a, b) => {
    const sa = a.score ?? -1;
    const sb = b.score ?? -1;
    if (sb !== sa) return sb - sa;
    return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
  });
  return sorted.slice(0, 3).map((p) => p.address);
}

/** A fair shared seed for everyone in a tournament (fits in a Postgres bigint). */
export function newSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}
