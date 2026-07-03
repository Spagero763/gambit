// MiniPay compatibility helpers (listing rules from docs.minipay.xyz).
//
// MiniPay is Opera's stablecoin wallet: users hold USDm/USDC and NO CELO —
// the wallet pays gas in stablecoins itself (fee abstraction). Its in-app
// browser injects window.ethereum with isMiniPay, requires apps to connect
// silently (no button, no modal, no signature on load), and only accepts
// LEGACY transactions (EIP-1559 fields are ignored).

/** Are we running inside MiniPay's in-app browser? Safe anywhere (false on server). */
export function inMiniPay(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay;
}

/** Spread into write/send calls: MiniPay only accepts legacy transactions. */
export function miniPayTx(): { type: "legacy" } | Record<string, never> {
  return inMiniPay() ? { type: "legacy" } : {};
}

/**
 * Should we skip the "you need CELO for gas" preflight? Inside MiniPay the
 * answer is yes — users hold zero CELO by design and MiniPay pays network
 * fees from their stablecoin balance, so the check would wrongly block them.
 */
export function skipGasPreflight(): boolean {
  return inMiniPay();
}
