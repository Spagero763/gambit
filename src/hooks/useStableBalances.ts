"use client";

import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { tokensFor, StakeToken } from "@/lib/tokens";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

export interface StableBalance {
  token: StakeToken;
  raw: bigint;
  amount: number;
}

/**
 * Every supported stablecoin balance, plus the one the player holds the most of.
 *
 * MiniPay listing rule ("Dynamic Adaptation"): adapt to the user's preferred
 * stablecoin rather than hard-coding one. So the wallet chip and the stake
 * selectors default to whatever they actually hold, and someone funded only in
 * USDT never sees a confusing 0.00 USDm.
 *
 * Hook count is fixed because `tokensFor` returns a stable list per chain.
 */
export function useStableBalances(address?: `0x${string}`) {
  const tokens = tokensFor(ACTIVE_CHAIN_ID);

  const results = tokens.map((t) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable list length per chain
    useBalance({ address, token: t.address, query: { enabled: !!address } })
  );

  const balances: StableBalance[] = tokens.map((token, i) => {
    const raw = results[i].data?.value ?? BigInt(0);
    return { token, raw, amount: Number(formatUnits(raw, token.decimals)) };
  });

  // highest holding wins; ties fall back to the list order (USDT, USDC, USDm)
  const preferred = balances.reduce((best, b) => (b.amount > best.amount ? b : best), balances[0]);
  const total = balances.reduce((s, b) => s + b.amount, 0);
  const loading = results.some((r) => r.isLoading);

  return { balances, preferred, total, loading, refetch: () => results.forEach((r) => r.refetch()) };
}
