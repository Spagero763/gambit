"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useInMiniPay } from "@/lib/minipay";

// MiniPay connects by itself, so screens stay quiet while it does and only
// speak up if it never lands.
export function useWalletReach() {
  const { isConnected } = useAccount();
  const miniPay = useInMiniPay();
  const { connect, connectors } = useConnect();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!miniPay || isConnected) return;
    const t = setTimeout(() => setFailed(true), 6000);
    return () => clearTimeout(t);
  }, [miniPay, isConnected]);

  const retry = () => {
    setFailed(false);
    const injected = connectors.find((c) => c.type === "injected" || c.id === "injected");
    if (injected) connect({ connector: injected });
  };

  return { miniPay, connecting: miniPay && !isConnected && !failed, failed: miniPay && !isConnected && failed, retry };
}
