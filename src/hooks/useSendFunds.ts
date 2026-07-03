"use client";

import { useCallback, useState } from "react";
import { parseUnits, isAddress } from "viem";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useSendTransaction,
} from "wagmi";
import { ERC20_ABI } from "@/lib/escrow";
import { friendlyError } from "@/lib/errors";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { miniPayTx, skipGasPreflight } from "@/lib/minipay";

// keep a little CELO back so the wallet can still pay this transfer's gas
const MIN_GAS_WEI = BigInt(2_000_000_000_000_000); // 0.002 CELO

export type SendStep = "idle" | "sending" | "confirming" | "done" | "error";

/** An asset to send: a real ERC-20 (USDm/USDC) or the chain's native CELO. */
export type SendAsset =
  | { kind: "native"; symbol: "CELO"; decimals: 18 }
  | { kind: "erc20"; address: `0x${string}`; symbol: string; decimals: number };

/**
 * Send CELO or an ERC-20 (USDm/USDC) from the connected wallet to any address.
 * Mirrors useStakeMatch's preflight style: catch bad address / not-enough-funds
 * / no-gas BEFORE the wallet pops, with words a human understands.
 */
export function useSendFunds() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [step, setStep] = useState<SendStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const send = useCallback(
    async (asset: SendAsset, to: string, amount: string) => {
      try {
        setError(null);
        setTxHash(null);
        if (!address || !publicClient) throw new Error("Wallet not ready");

        const dest = to.trim();
        if (!isAddress(dest)) throw new Error("That doesn't look like a valid wallet address.");
        if (dest.toLowerCase() === address.toLowerCase()) throw new Error("That's this wallet's own address.");
        const n = Number(amount);
        if (!Number.isFinite(n) || n <= 0) throw new Error("Enter an amount greater than zero.");

        const gas = await publicClient.getBalance({ address });

        let hash: `0x${string}`;
        if (asset.kind === "native") {
          const value = parseUnits(amount, 18);
          // must leave enough behind to pay this send's own gas (MiniPay pays
          // fees from stablecoins, so its users don't need the CELO cushion)
          if (!skipGasPreflight() && value + MIN_GAS_WEI > gas) {
            throw new Error("Not enough CELO — leave a little behind to cover the network fee.");
          }
          setStep("sending");
          hash = await sendTransactionAsync({ to: dest as `0x${string}`, value, ...miniPayTx() });
        } else {
          if (!skipGasPreflight() && gas < MIN_GAS_WEI) {
            throw new Error("This wallet needs a little CELO for the network fee — send it ~0.01 CELO and retry.");
          }
          const value = parseUnits(amount, asset.decimals);
          const bal = (await publicClient.readContract({
            address: asset.address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          })) as bigint;
          if (bal < value) throw new Error(`Not enough ${asset.symbol} in this wallet.`);
          setStep("sending");
          hash = await writeContractAsync({
            address: asset.address,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [dest as `0x${string}`, value],
            ...miniPayTx(),
          });
        }

        setTxHash(hash);
        setStep("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transfer reverted on-chain");
        setStep("done");
        return true;
      } catch (e: any) {
        setError(friendlyError(e));
        setStep("error");
        return false;
      }
    },
    [address, publicClient, sendTransactionAsync, writeContractAsync]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { send, step, error, txHash, reset, onActiveChain: chainId === ACTIVE_CHAIN_ID };
}
