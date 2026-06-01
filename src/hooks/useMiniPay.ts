"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

/**
 * Detects whether the app is running inside MiniPay and auto-connects the
 * injected wallet. Inside MiniPay the connection is implicit, so the UI should
 * hide any manual "Connect" affordance (returned as `isMiniPay`).
 */
export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [ready, setReady] = useState(false);
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    if (eth && eth.isMiniPay) {
      setIsMiniPay(true);
      if (!isConnected) {
        connect({ connector: injected() });
      }
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isMiniPay, ready };
}
