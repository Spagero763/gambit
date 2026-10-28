"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { inMiniPay } from "@/lib/minipay";
import { savedPrivySession, setAuthState, usePrivyWanted, wantPrivy } from "@/lib/auth";

const PrivyLayer = dynamic(() => import("@/components/PrivyLayer"), { ssr: false });

// Decides when the web sign-in SDK loads: never in MiniPay, at idle when a
// session is saved, otherwise only once someone taps Sign in.
export function AuthHost() {
  const wanted = usePrivyWanted();

  useEffect(() => {
    if (inMiniPay() || !savedPrivySession()) {
      setAuthState({ ready: true });
      return;
    }
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(wantPrivy, { timeout: 2500 });
    else setTimeout(wantPrivy, 1200);
  }, []);

  return wanted ? <PrivyLayer /> : null;
}
