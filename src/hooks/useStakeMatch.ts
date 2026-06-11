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
import { StakeToken } from "@/lib/tokens";
import { friendlyError } from "@/lib/errors";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";

// enough CELO for a few transactions' gas — below this, wallets show scary
// fee estimates or "unavailable", so we catch it with a clear message first
const MIN_GAS_WEI = BigInt(2_000_000_000_000_000); // 0.002 CELO

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

  /** Catch the problems BEFORE the wallet opens, with words humans understand. */
  const preflight = useCallback(
    async (amount: bigint, tokenAddress: `0x${string}`, symbol: string) => {
      if (!address || !publicClient) throw new Error("Not ready");
      const [gas, bal] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
      ]);
      if (bal < amount) throw new Error(`Not enough ${symbol} in this wallet to cover the stake.`);
      if (gas < MIN_GAS_WEI) throw new Error("This wallet needs a little CELO for network fees — send it ~0.01 CELO and retry.");
    },
    [address, publicClient]
  );

  const ensureAllowance = useCallback(
    async (amount: bigint, tokenAddress: `0x${string}`) => {
      const { address: escrow } = escrowFor(chainId);
      if (!escrow || !address || !publicClient) throw new Error("Not ready");
      const allowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, escrow],
      })) as bigint;
      if (allowance < amount) {
        setStep("approving");
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [escrow, amount],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Token approval failed on-chain");
      }
    },
    [address, chainId, publicClient, writeContractAsync]
  );

  /** Create a staked room. Returns the new match id parsed from the event. */
  const createMatch = useCallback(
    async (stakeAmount: number, gameType: number, capacity: number, stakeToken: StakeToken) => {
      try {
        setError(null);
        const { address: escrow } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const amount = parseUnits(stakeAmount.toString(), stakeToken.decimals);
        await preflight(amount, stakeToken.address, stakeToken.symbol);
        await ensureAllowance(amount, stakeToken.address);

        setStep("creating");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "createMatch",
          args: [stakeToken.address, amount, gameType, capacity],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // waitForTransactionReceipt does NOT throw on revert — a reverted
        // create/join silently "succeeding" is how phantom seats happen.
        if (receipt.status !== "success") throw new Error("Transaction reverted on-chain");

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
        setError(friendlyError(e));
        setStep("error");
        return null;
      }
    },
    [chainId, ensureAllowance, publicClient, writeContractAsync]
  );

  /** Join an existing staked room by id. */
  const joinMatch = useCallback(
    async (id: bigint, stakeAmount: number, stakeToken: StakeToken) => {
      try {
        setError(null);
        const { address: escrow } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const amount = parseUnits(stakeAmount.toString(), stakeToken.decimals);

        // verify the room is actually joinable before any wallet popups —
        // this is what used to surface as scary gas estimates / "unavailable"
        const m = (await publicClient.readContract({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "matches",
          args: [id],
        })) as readonly unknown[];
        const status = Number(m[9]);
        const joinDeadline = Number(m[4]) * 1000;
        const joined = Number(m[8]);
        const capacity = Number(m[7]);
        if (status === 0) throw new Error("That room doesn't exist — double-check the ID.");
        if (status !== 1) throw new Error("This room already started or was cancelled.");
        if (Date.now() > joinDeadline) throw new Error("The join window has closed — this room can't be joined anymore.");
        if (joined >= capacity) throw new Error("This room is already full.");
        await preflight(amount, stakeToken.address, stakeToken.symbol);
        await ensureAllowance(amount, stakeToken.address);

        setStep("joining");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "joinMatch",
          args: [id],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Join failed on-chain — the room may be full or its join window expired");
        }
        setMatchId(id);
        setStep("waiting");
        return true;
      } catch (e: any) {
        setError(friendlyError(e));
        setStep("error");
        return false;
      }
    },
    [chainId, ensureAllowance, publicClient, writeContractAsync]
  );

  /** Refund an unfilled room you created (creator may cancel anytime while open). */
  const cancelMatch = useCallback(
    async (matchId: bigint) => {
      try {
        setError(null);
        const { address: escrow } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "cancelMatch",
          args: [matchId],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Cancel reverted — the room may have already started");
        return true;
      } catch (e: any) {
        setError(friendlyError(e));
        return false;
      }
    },
    [chainId, publicClient, writeContractAsync]
  );

  /** Permissionless refund of a filled match that never settled (after the settle window). */
  const reclaimStalled = useCallback(
    async (matchId: bigint) => {
      try {
        setError(null);
        const { address: escrow } = escrowFor(chainId);
        if (!escrow || !publicClient) throw new Error("Wrong network");
        const hash = await writeContractAsync({
          address: escrow,
          abi: ESCROW_ABI,
          functionName: "reclaimStalled",
          args: [matchId],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Reclaim reverted — the settle window may not have lapsed yet");
        return true;
      } catch (e: any) {
        setError(friendlyError(e));
        return false;
      }
    },
    [chainId, publicClient, writeContractAsync]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setMatchId(null);
  }, []);

  const ready = !!escrowFor(chainId).address;
  const onActiveChain = chainId === ACTIVE_CHAIN_ID;

  return { createMatch, joinMatch, cancelMatch, reclaimStalled, step, error, matchId, reset, ready, onActiveChain };
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
