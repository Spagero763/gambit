"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect } from "wagmi";
import { inMiniPay } from "@/lib/minipay";

/** A couple of spaced attempts, then stop. Never a tight loop. */
const ATTEMPTS = [0, 400, 1200];

/**
 * MiniPay listing rule: Mini Apps must connect to the wallet automatically on
 * load — no connect button, no wallet modal, no signature prompt. Outside
 * MiniPay this renders nothing and Privy handles sign-in as usual.
 *
 * The injected provider is sometimes not registered on the very first render,
 * and a single attempt that landed in that gap left the player stuck on
 * "Connecting…" forever. So we make a few spaced attempts and then give up.
 */
export function MiniPayConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // latest connector list, reachable from the timers without restarting them
  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;

  const started = useRef(false);

  useEffect(() => {
    if (started.current || isConnected || !inMiniPay()) return;
    started.current = true;

    const attempt = () => {
      const injected = connectorsRef.current.find((c) => c.type === "injected" || c.id === "injected");
      if (injected) connect({ connector: injected });
    };
    const timers = ATTEMPTS.map((ms) => setTimeout(attempt, ms));

    return () => timers.forEach(clearTimeout);
  }, [isConnected, connect]);

  return null;
}
