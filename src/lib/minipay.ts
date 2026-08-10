// MiniPay compatibility helpers (listing rules from docs.minipay.xyz).
//
// MiniPay is Opera's stablecoin wallet: users hold USDT/USDC/USDm and NO CELO —
// the wallet pays network fees in stablecoins itself (fee abstraction). Its
// in-app browser injects window.ethereum with isMiniPay, requires apps to
// connect silently (no button, no modal, no signature on load), and only
// accepts LEGACY transactions (EIP-1559 fields are ignored).

import { useEffect, useState } from "react";

/** Are we running inside MiniPay's in-app browser? Safe anywhere (false on server). */
export function inMiniPay(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay;
}

/**
 * React-safe version of `inMiniPay()`. Always false on the first render so the
 * client's markup matches the server's, then flips after mount. Calling
 * `inMiniPay()` directly during render would hydration-mismatch every component
 * that branches on it.
 */
export function useInMiniPay(): boolean {
  const [is, setIs] = useState(false);
  useEffect(() => setIs(inMiniPay()), []);
  return is;
}

/** Spread into write/send calls: MiniPay only accepts legacy transactions. */
export function miniPayTx(): { type: "legacy" } | Record<string, never> {
  return inMiniPay() ? { type: "legacy" } : {};
}

/**
 * Should we skip the "you need CELO for the network fee" preflight? Inside
 * MiniPay the answer is yes — users hold zero CELO by design and MiniPay pays
 * network fees from their stablecoin balance, so the check would wrongly block.
 */
export function skipGasPreflight(): boolean {
  return inMiniPay();
}

/**
 * MiniPay's Add Cash deeplink. Listing rule: when someone's balance is too low
 * to act, send them here to top up instead of showing an error.
 */
export const ADD_CASH_URL = "https://link.minipay.xyz/add_cash?tokens=USDT,USDC,USDm";

/** Open the deposit screen (MiniPay) or fall back to a new tab elsewhere. */
export function openDeposit() {
  if (typeof window !== "undefined") window.location.href = ADD_CASH_URL;
}
