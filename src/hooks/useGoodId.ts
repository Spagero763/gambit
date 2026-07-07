"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { celo } from "viem/chains";
import { IdentitySDK, SupportedChains } from "@goodsdks/citizen-sdk";

/**
 * GoodDollar identity (GoodID) — Sybil resistance via face verification.
 *
 * Status (`verified`) comes from OUR server, which reads GoodDollar's Identity
 * contract directly with RPC failover — reliable for every signed-in user.
 * The SDK is only needed for verify() (it signs the face-verification link),
 * and it initialises ON DEMAND with retry: a failed init on page load can
 * never permanently brick the button again.
 */
export function useGoodId() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const sdkRef = useRef<IdentitySDK | null>(null);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // status: server-side read, works regardless of the SDK
  const refresh = useCallback(async () => {
    if (!address) {
      setVerified(null);
      return;
    }
    setChecking(true);
    try {
      const r = await fetch(`/api/goodid?address=${address.toLowerCase()}`);
      const d = await r.json();
      setVerified(typeof d.verified === "boolean" ? d.verified : null);
    } catch {
      setVerified(null);
    } finally {
      setChecking(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Initialise (or reuse) the SDK. Throws readable messages, never bricks. */
  const initSdk = useCallback(async (): Promise<IdentitySDK> => {
    if (sdkRef.current) return sdkRef.current;
    if (!publicClient || !walletClient) {
      throw new Error("Sign in first, then tap verify again.");
    }
    // GoodDollar identity lives on Celo — bring the wallet there if needed
    if (walletClient.chain?.id !== celo.id) {
      try {
        await switchChainAsync({ chainId: celo.id });
      } catch {
        throw new Error("Switch your wallet to the Celo network, then tap again.");
      }
    }
    try {
      const s = await IdentitySDK.init({
        // wagmi/viem client types are structurally compatible; cast to avoid
        // generic-version friction between our viem and the SDK's.
        publicClient: publicClient as any,
        walletClient: walletClient as any,
        env: "production",
      });
      sdkRef.current = s;
      setReady(true);
      return s;
    } catch {
      throw new Error("Verification service did not respond. Refresh the page and try once more.");
    }
  }, [publicClient, walletClient, switchChainAsync]);

  // warm it up in the background too, so most taps are instant
  useEffect(() => {
    if (!publicClient || !walletClient || sdkRef.current) return;
    initSdk().catch(() => {
      /* on-demand init in verify() is the real path; this is just warmup */
    });
  }, [publicClient, walletClient, initSdk]);

  /** Open GoodDollar Face Verification; returns here when done. */
  const verify = useCallback(async () => {
    const s = await initSdk();
    const callback = typeof window !== "undefined" ? window.location.href : undefined;
    const link = await s.generateFVLink(false, callback, SupportedChains.CELO);
    if (typeof window !== "undefined") window.location.href = link;
  }, [initSdk]);

  return { verified, checking, verify, refresh, ready };
}
