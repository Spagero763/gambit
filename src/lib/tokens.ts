import { celo, celoSepolia } from "viem/chains";

/** A stake token. `decimals` matters — USDm is 18, USDT and USDC are 6. */
export interface StakeToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

const CUSD: StakeToken = {
  address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  symbol: "USDm",
  decimals: 18,
};

// Circle USDC on Celo mainnet (6 decimals). Must be allowlisted on the escrow
// (owner calls setTokenAllowed) before it can be staked.
const USDC_CELO: StakeToken = {
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  symbol: "USDC",
  decimals: 6,
};

// Tether USD₮ on Celo mainnet (6 decimals). Address taken from MiniPay's own
// mainnet token list — USDT support is mandatory for a MiniPay listing.
// Must be allowlisted on the escrow (owner calls setTokenAllowed) to be staked.
const USDT_CELO: StakeToken = {
  address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  symbol: "USDT",
  decimals: 6,
};

// MiniPay supports USDT, USDC and USDm only — in that order of prominence.
export const STAKE_TOKENS: Record<number, StakeToken[]> = {
  [celo.id]: [USDT_CELO, USDC_CELO, CUSD],
  [celoSepolia.id]: [CUSD],
};

export function tokensFor(chainId?: number): StakeToken[] {
  return (chainId && STAKE_TOKENS[chainId]) || STAKE_TOKENS[celoSepolia.id];
}

/**
 * USDm, the token Gambit launched on. Match rows written before the token column
 * existed have no token recorded, and every one of them was a USDm stake — so
 * anything reading history needs this explicitly rather than reaching for the
 * first token in the list, which is now USDT.
 */
export const USDM_ADDRESS = CUSD.address.toLowerCase();

function lookup(address?: string | null): StakeToken | null {
  if (!address) return null;
  const a = address.toLowerCase();
  for (const list of Object.values(STAKE_TOKENS)) {
    const t = list.find((x) => x.address.toLowerCase() === a);
    if (t) return t;
  }
  // Historic stakes may reference a token we no longer offer (G$ was retired).
  // Resolve those so old match rows still render with the right symbol/decimals.
  return RETIRED[a] ?? null;
}

/** Tokens no longer offered, kept so historic matches still display correctly. */
const RETIRED: Record<string, StakeToken> = {
  "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a": {
    address: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    symbol: "G$",
    decimals: 18,
  },
};

/** Decimals for a stored stake token address (defaults to 18 = USDm). */
export function decimalsForToken(address?: string | null): number {
  return lookup(address)?.decimals ?? 18;
}

/** Symbol for a stored stake token address (defaults to USDm). */
export function symbolForToken(address?: string | null): string {
  return lookup(address)?.symbol ?? "USDm";
}
