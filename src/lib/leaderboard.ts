import { formatUnits } from "viem";

export interface Standing {
  handle: string; // wallet address (lowercase)
  net: number; // net cUSD across settled staked matches
  wins: number;
  losses: number;
}

interface SettledMatch {
  creator: string;
  opponent: string | null;
  winner: string | null;
  stake: string;
}

const FEE = 0.05;

/** Aggregate settled staked matches into a ranked standings table. */
export function aggregateStandings(matches: SettledMatch[]): Standing[] {
  const by = new Map<string, Standing>();
  const get = (a: string) =>
    by.get(a) ?? by.set(a, { handle: a, net: 0, wins: 0, losses: 0 }).get(a)!;

  for (const m of matches) {
    if (!m.winner) continue; // draws are refunded — no effect on standings
    const stake = Number(formatUnits(BigInt(m.stake || "0"), 18));
    const winner = m.winner.toLowerCase();
    const players = [m.creator?.toLowerCase(), m.opponent?.toLowerCase()].filter(Boolean) as string[];
    for (const p of players) {
      const row = get(p);
      if (p === winner) {
        row.wins += 1;
        row.net += stake * (1 - FEE);
      } else {
        row.losses += 1;
        row.net -= stake;
      }
    }
  }

  return Array.from(by.values());
}
