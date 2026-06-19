"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether we're running inside MiniPay's in-app browser. Connection is
 * handled by Privy now (its modal lists the injected MiniPay wallet), so this
 * is detection-only — used to tailor copy/UX.
 */
export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    if (eth && eth.isMiniPay) setIsMiniPay(true);
    setReady(true);
  }, []);

  return { isMiniPay, ready };
}
