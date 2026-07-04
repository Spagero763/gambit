"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { hasToken } from "@/lib/profile";
import { pushSupported, isPushEnabled, enablePush, disablePush } from "@/lib/push";
import { cn } from "@/lib/cn";

/** Settings toggle for match/tournament push alerts on this device. */
export function PushToggle() {
  const { address, isConnected } = useAccount();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const authed = hasToken(address);

  useEffect(() => {
    setSupported(pushSupported());
    isPushEnabled().then(setOn).catch(() => {});
  }, []);

  if (!supported) {
    return (
      <p className="py-1 text-[12px] text-ink-faint">
        This browser doesn&apos;t support notifications. On iPhone, add Gambit to your Home Screen first.
      </p>
    );
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
      } else if (address) {
        const ok = await enablePush(address);
        setOn(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  const disabled = !isConnected || !authed;

  return (
    <div>
      <button
        onClick={toggle}
        disabled={disabled || busy}
        className="flex w-full items-center justify-between py-2.5 text-left disabled:opacity-50"
      >
        <span>
          <span className="block text-sm font-medium text-ink">Match alerts</span>
          <span className="block text-[11px] text-ink-faint">
            Your turn · opponent joined · cup started · you got paid
          </span>
        </span>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
        ) : (
          <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-teal" : "bg-void-600")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
          </span>
        )}
      </button>
      {disabled && (
        <p className="mt-1 text-[11px] text-ink-faint">Sign in first. Alerts are tied to your account.</p>
      )}
    </div>
  );
}
