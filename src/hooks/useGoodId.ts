"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { IdentitySDK, SupportedChains } from "@goodsdks/citizen-sdk";

/**
 * GoodDollar identity (GoodID) — Sybil resistance via face verification.
 *
 * Status (`verified`) comes from OUR server, which reads GoodDollar's Identity
 * contract directly with RPC failover — so it works for every signed-in user,
 * even when the client SDK can't initialise. The SDK is only needed for the
 * verify() flow itself (it signs the face-verification link).
 */
export function useGoodId() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [sdk, setSdk] = useState<IdentitySDK | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // status: server-side read, reliable for everyone
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

  // the SDK is only for verify(); init lazily and don't let failures hide UI
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
        /* SDK init failed — status still works via the server */
      });
    return () => {
      active = false;
    };
  }, [publicClient, walletClient]);

  /** Open GoodDollar Face Verification; returns here when done.
   *  Throws a readable message when the wallet layer isn't ready yet. */
  const verify = useCallback(async () => {
    if (!sdk) {
      throw new Error("Your wallet is still waking up. Wait a second and tap again.");
    }
    const callback = typeof window !== "undefined" ? window.location.href : undefined;
    const link = await sdk.generateFVLink(false, callback, SupportedChains.CELO);
    if (typeof window !== "undefined") window.location.href = link;
  }, [sdk]);

  return { verified, checking, verify, refresh, ready: !!sdk };
}
