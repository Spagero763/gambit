import { celo, celoSepolia } from "viem/chains";

/** A stake token. `decimals` matters — USDm is 18, USDC is 6. */
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

export const STAKE_TOKENS: Record<number, StakeToken[]> = {
  [celo.id]: [CUSD, USDC_CELO],
  [celoSepolia.id]: [CUSD],
};

export function tokensFor(chainId?: number): StakeToken[] {
  return (chainId && STAKE_TOKENS[chainId]) || STAKE_TOKENS[celoSepolia.id];
}

function lookup(address?: string | null): StakeToken | null {
  if (!address) return null;
  const a = address.toLowerCase();
  for (const list of Object.values(STAKE_TOKENS)) {
    const t = list.find((x) => x.address.toLowerCase() === a);
    if (t) return t;
  }
  return null;
}

/** Decimals for a stored stake token address (defaults to 18 = USDm). */
export function decimalsForToken(address?: string | null): number {
  return lookup(address)?.decimals ?? 18;
}

/** Symbol for a stored stake token address (defaults to USDm). */
export function symbolForToken(address?: string | null): string {
  return lookup(address)?.symbol ?? "USDm";
}
