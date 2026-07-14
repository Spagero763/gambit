"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { celo } from "viem/chains";
import { formatUnits } from "viem";
import { ClaimSDK, IdentitySDK } from "@goodsdks/citizen-sdk";

/**
 * GoodDollar UBI — the real daily claim, funded by GoodDollar, not by us.
 *
 * This is the piece that unblocks everything: a fresh embedded wallet has no
 * CELO, so it cannot send ANY transaction, which is why almost nobody could
 * stake. ClaimSDK.claim() tops the wallet up from GoodDollar's faucet when the
 * balance is too low, then claims the UBI. So one tap gives a brand new player
 * both spendable G$ AND the gas to actually play a staked match.
 *
 * Only GoodID-verified humans can claim (status === "not_whitelisted" means they
 * still need to verify — that is what `verify()` in useGoodId is for).
 */
export type ClaimState = "loading" | "can_claim" | "claimed" | "needs_verify" | "unavailable";

export function useGoodDollarClaim() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const sdkRef = useRef<ClaimSDK | null>(null);
  const [state, setState] = useState<ClaimState>("loading");
  const [amount, setAmount] = useState<number>(0); // claimable G$, human units
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initSdk = useCallback(async (): Promise<ClaimSDK> => {
    if (sdkRef.current) return sdkRef.current;
    if (!address || !publicClient || !walletClient) throw new Error("Sign in first.");
    if (walletClient.chain?.id !== celo.id) {
      try {
        await switchChainAsync({ chainId: celo.id });
      } catch {
        throw new Error("Switch your wallet to Celo, then try again.");
      }
    }
    const identity = await IdentitySDK.init({
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      env: "production",
    });
    const sdk = await ClaimSDK.init({
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      identitySDK: identity,
      env: "production",
      rdu: typeof window !== "undefined" ? window.location.href : undefined,
    });
    sdkRef.current = sdk;
    return sdk;
  }, [address, publicClient, walletClient, switchChainAsync]);

  /** Read where this wallet stands: can claim, already claimed, or not verified. */
  const refresh = useCallback(async () => {
    if (!address || !publicClient || !walletClient) {
      setState("loading");
      return;
    }
    try {
      const sdk = await initSdk();
      const s = await sdk.getWalletClaimStatus();
      setAmount(Number(formatUnits(s.entitlement ?? BigInt(0), 18)));
      setNextAt(s.nextClaimTime ?? null);
      setState(
        s.status === "can_claim" ? "can_claim" : s.status === "already_claimed" ? "claimed" : "needs_verify"
      );
    } catch {
      // never brick the UI — just hide the card
      setState("unavailable");
    }
  }, [address, publicClient, walletClient, initSdk]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Claim the UBI. GoodDollar's faucet tops up gas first if the wallet is empty. */
  const claim = useCallback(async () => {
    if (claiming) return;
    setError(null);
    setClaiming(true);
    try {
      const sdk = await initSdk();
      const receipt = await sdk.claim();
      setTx((receipt as any)?.transactionHash ?? null);
      setState("claimed");
      await refresh();
    } catch (e: any) {
      const m = String(e?.shortMessage ?? e?.message ?? "Could not claim right now.");
      setError(
        /whitelist|verif/i.test(m)
          ? "Verify you are human first, it is free and takes about a minute."
          : "Could not claim right now. Try again in a moment."
      );
    } finally {
      setClaiming(false);
    }
  }, [claiming, initSdk, refresh]);

  return { state, amount, nextAt, claim, claiming, tx, error, refresh };
}
