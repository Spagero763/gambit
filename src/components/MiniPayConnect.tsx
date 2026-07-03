"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect } from "wagmi";
import { inMiniPay } from "@/lib/minipay";

/**
 * MiniPay listing rule: Mini Apps must connect to the wallet automatically on
 * load — no connect button, no wallet modal, no signature prompt. Outside
 * MiniPay this renders nothing and Privy handles sign-in as usual.
 */
export function MiniPayConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || isConnected || !inMiniPay()) return;
    const injected = connectors.find((c) => c.type === "injected" || c.id === "injected");
    if (!injected) return;
    tried.current = true; // one attempt — MiniPay docs warn against retry loops
    connect({ connector: injected });
  }, [isConnected, connect, connectors]);

  return null;
}
