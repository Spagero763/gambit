"use client";

import { useReadContracts } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow";
import { tokensFor, StakeToken } from "@/lib/tokens";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

/**
 * The stake tokens the escrow will actually accept, read from the contract.
 *
 * A token in the UI that the escrow rejects is the worst kind of bug here: the
 * player pays gas on the ERC20 approve, then the stake reverts and they are out
 * of pocket with nothing to show. So the picker offers what the chain says is
 * allowed, not what the token list hopes is allowed. When the owner allowlists a
 * new token it appears on its own, no redeploy.
 *
 * While the read is in flight we return the full list rather than an empty one,
 * so the picker never flashes empty on a slow connection.
 */
export function useAllowedTokens(chainId?: number): { tokens: StakeToken[]; loading: boolean } {
  const id = chainId ?? ACTIVE_CHAIN_ID;
  const all = tokensFor(id);
  const escrow = ESCROW_ADDRESS[id];

  const { data, isLoading } = useReadContracts({
    contracts: all.map((t) => ({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "allowedTokens" as const,
      args: [t.address] as const,
      chainId: id,
    })),
    query: { enabled: !!escrow, staleTime: 5 * 60_000 },
  });

  if (isLoading || !data) return { tokens: all, loading: isLoading };

  const allowed = all.filter((_, i) => data[i]?.status === "success" && data[i]?.result === true);
  // A contract that answers "none allowed" is almost certainly a bad read, not a
  // dead escrow. Falling back to the full list keeps the app usable either way.
  return { tokens: allowed.length ? allowed : all, loading: false };
}
