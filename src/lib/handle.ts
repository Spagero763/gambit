/**
 * A friendly, deterministic display handle for wallets with no profile name.
 * The same address always maps to the same handle (on every device), so the
 * leaderboard stays consistent — and raw 0x… hex never appears as a player's
 * primary identity (a MiniPay listing rule, and just nicer to compete against).
 */

const FIRST = [
  "Swift", "Quiet", "Bold", "Lucky", "Sharp", "Golden", "Iron", "Wise",
  "Fast", "Cool", "Brave", "Sly", "Calm", "Wild", "Keen", "Royal",
];

const SECOND = [
  "Rook", "Knight", "Bishop", "Queen", "Pawn", "King", "Whot", "Ace",
  "Dice", "Star", "Joker", "Card", "Ladder", "Blitz", "Check", "Gambit",
];

export function handleFor(address?: string | null): string {
  if (!address) return "Player";
  // two stable nibbles of the address pick the pair; last two chars add a tag
  const a = address.toLowerCase().replace(/^0x/, "");
  const x = parseInt(a.slice(0, 2), 16) || 0;
  const y = parseInt(a.slice(2, 4), 16) || 0;
  return `${FIRST[x % FIRST.length]} ${SECOND[y % SECOND.length]} ${a.slice(-2).toUpperCase()}`;
}

/** Profile name if set, otherwise the stable generated handle. */
export function displayName(name: string | null | undefined, address?: string | null): string {
  const n = (name ?? "").trim();
  return n || handleFor(address);
}
