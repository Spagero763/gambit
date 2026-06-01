export interface Ranked {
  rank: number;
  handle: string;
  region: string;
  xp: number;
  won: number; // cUSD won
  wins: number;
  losses: number;
}

// Placeholder standings until live results are wired in.
export const FREE_BOARD: Ranked[] = [
  { rank: 1, handle: "kwame.eth", region: "GH", xp: 14820, won: 0, wins: 211, losses: 34 },
  { rank: 2, handle: "zaraplays", region: "KE", xp: 13110, won: 0, wins: 188, losses: 41 },
  { rank: 3, handle: "miguel_07", region: "AR", xp: 12440, won: 0, wins: 174, losses: 52 },
  { rank: 4, handle: "thandiwe", region: "ZA", xp: 9980, won: 0, wins: 140, losses: 48 },
  { rank: 5, handle: "binita.cel", region: "NP", xp: 9210, won: 0, wins: 131, losses: 55 },
  { rank: 6, handle: "oladayo", region: "NG", xp: 8770, won: 0, wins: 122, losses: 60 },
  { rank: 7, handle: "lan_pham", region: "VN", xp: 8030, won: 0, wins: 118, losses: 63 },
  { rank: 8, handle: "rosa.m", region: "CO", xp: 7440, won: 0, wins: 109, losses: 58 },
];

export const STAKED_BOARD: Ranked[] = [
  { rank: 1, handle: "kwame.eth", region: "GH", xp: 0, won: 184.5, wins: 96, losses: 21 },
  { rank: 2, handle: "the_grandm", region: "PH", xp: 0, won: 152.2, wins: 88, losses: 24 },
  { rank: 3, handle: "zaraplays", region: "KE", xp: 0, won: 141.0, wins: 81, losses: 27 },
  { rank: 4, handle: "deji.cel", region: "NG", xp: 0, won: 119.75, wins: 70, losses: 31 },
  { rank: 5, handle: "sofia_r", region: "MX", xp: 0, won: 98.3, wins: 64, losses: 29 },
  { rank: 6, handle: "amani.k", region: "TZ", xp: 0, won: 86.1, wins: 58, losses: 33 },
  { rank: 7, handle: "ravi.cel", region: "IN", xp: 0, won: 74.6, wins: 52, losses: 30 },
  { rank: 8, handle: "lucia.b", region: "BR", xp: 0, won: 61.2, wins: 47, losses: 35 },
];
