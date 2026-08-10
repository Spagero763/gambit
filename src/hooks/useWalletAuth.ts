"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useInMiniPay } from "@/lib/minipay";

/**
 * The app's one answer to "is this player signed in, and how do they sign in?"
 *
 * `signedIn` is a connected wallet, not Privy's `authenticated` — inside MiniPay
 * the injected wallet attaches on load and Privy never authenticates, so keying
 * off `authenticated` left "Sign in" buttons all over a session that was already
 * signed in (MiniPay review item 2).
 *
 * `canSignIn` is false inside MiniPay, so screens can hide their sign-in CTA
 * instead of prompting for something that happens by itself. `signIn` is a no-op
 * there, which keeps call sites from having to branch.
 */
export function useWalletAuth() {
  const { address } = useAccount();
  const { ready, authenticated, login } = usePrivy();
  const miniPay = useInMiniPay();

  const signIn = useCallback(() => {
    if (!miniPay) login();
  }, [miniPay, login]);

  return {
    address,
    signedIn: !!address,
    /** signed in with Privy but the embedded wallet has not landed yet */
    provisioning: authenticated && !address,
    /** MiniPay connects on its own, so there is no sign-in to offer */
    canSignIn: !miniPay,
    inMiniPay: miniPay,
    ready,
    signIn,
  };
}
