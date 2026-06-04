"use client";

import { useCallback, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import {
  ESCROW_ABI,
  ESCROW_ADDRESS,
  ERC20_ABI,
  STAKE_TOKEN,
} from "@/lib/escrow";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

export type StakeStep =
  | "idle"
  | "approving"
  | "creating"
  | "joining"
  | "waiting"
  | "done"
  | "error";

const CUSD_DECIMALS = 18;

function escrowFor(chainId?: number) {
  const id = chainId ?? ACTIVE_CHAIN_ID;
  return { address: ESCROW_ADDRESS[id], token: STAKE_TOKEN[id] };
}

/** Ensures the escrow is approved to pull `amount` of cUSD, then runs `action`. */
export function useStakeMatch() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<StakeStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<bigint | null>(null);

  const ensureAllowance = useCallback(
    async (amount: bigint) => {
      const { address: escrow, token } = escrowFor(chainId);
      if (!escrow || !address || !publicClient) throw new Error("Not ready");
      const allowance = (await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, escrow],
      })) as bigint;
      if (allowance < amount) {
        setStep("approving");
        const hash = await writeContractAsync({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [escrow, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    },
    [address, chainId, publicClient, writeContractAsync]
  );

  /** Create a staked room. Returns the new match id parsed from the event. */
  const createMatch = useCallback(
    async (stakeCusd: number, gameType: number, capacity: number) => {
      try {
        setError(null);
        const { address: escrow, token } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const amount = parseUnits(stakeCusd.toString(), CUSD_DECIMALS);
        await ensureAllowance(amount);

        setStep("creating");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "createMatch",
          args: [token, amount, gameType, capacity],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // pull the match id from the MatchCreated event (topic[1])
        let id: bigint | null = null;
        for (const lg of receipt.logs) {
          if (lg.address.toLowerCase() === escrow.toLowerCase() && lg.topics[1]) {
            id = BigInt(lg.topics[1]);
            break;
          }
        }
        setMatchId(id);
        setStep("waiting");
        return id;
      } catch (e: any) {
        setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
        setStep("error");
        return null;
      }
    },
    [chainId, ensureAllowance, publicClient, writeContractAsync]
  );

  /** Join an existing staked room by id. */
  const joinMatch = useCallback(
    async (id: bigint, stakeCusd: number) => {
      try {
        setError(null);
        const { address: escrow } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const amount = parseUnits(stakeCusd.toString(), CUSD_DECIMALS);
        await ensureAllowance(amount);

        setStep("joining");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "joinMatch",
          args: [id],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        setMatchId(id);
        setStep("waiting");
        return true;
      } catch (e: any) {
        setError(e?.shortMessage ?? e?.message ?? "Transaction failed");
        setStep("error");
        return false;
      }
    },
    [chainId, ensureAllowance, publicClient, writeContractAsync]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setMatchId(null);
  }, []);

  const ready = !!escrowFor(chainId).address;
  const onActiveChain = chainId === ACTIVE_CHAIN_ID;

  return { createMatch, joinMatch, step, error, matchId, reset, ready, onActiveChain };
}

/** Read a match's on-chain state (status, joined, stake). */
export function useMatchState(id?: bigint) {
  const { chainId } = useAccount();
  const { address: escrow } = escrowFor(chainId);
  return useReadContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "matches",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined && !!escrow, refetchInterval: 4000 },
  });
}
