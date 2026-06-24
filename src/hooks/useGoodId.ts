"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { IdentitySDK, SupportedChains } from "@goodsdks/citizen-sdk";

/**
 * GoodDollar identity (GoodID) — Sybil resistance via face verification.
 *
 * `verified` is whether the connected wallet is a whitelisted unique human on
 * GoodDollar's Identity contract (Celo). `verify()` opens GoodDollar's Face
 * Verification flow; on return the wallet is whitelisted. We use this to gate
 * free prize tournaments to one real human per entry — no IP guessing.
 */
export function useGoodId() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [sdk, setSdk] = useState<IdentitySDK | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // spin up the SDK once viem clients are available
  useEffect(() => {
    let active = true;
    if (!publicClient || !walletClient) return;
    IdentitySDK.init({
      // wagmi/viem client types are structurally compatible; cast to avoid
      // generic-version friction between our viem and the SDK's.
      publicClient: publicClient as any,
      walletClient: walletClient as any,
      env: "production",
    })
      .then((s) => {
        if (active) setSdk(s);
      })
      .catch(() => {
        /* SDK init failed (e.g. unsupported chain) — leave unverified */
      });
    return () => {
      active = false;
    };
  }, [publicClient, walletClient]);

  const refresh = useCallback(async () => {
    if (!sdk || !address) {
      setVerified(null);
      return;
    }
    setChecking(true);
    try {
      const { isWhitelisted } = await sdk.getWhitelistedRoot(address as `0x${string}`);
      setVerified(isWhitelisted);
    } catch {
      setVerified(null);
    } finally {
      setChecking(false);
    }
  }, [sdk, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Open GoodDollar Face Verification; returns here when done. */
  const verify = useCallback(async () => {
    if (!sdk) return;
    const callback = typeof window !== "undefined" ? window.location.href : undefined;
    const link = await sdk.generateFVLink(false, callback, SupportedChains.CELO);
    if (typeof window !== "undefined") window.location.href = link;
  }, [sdk]);

  return { verified, checking, verify, refresh, ready: !!sdk };
}
