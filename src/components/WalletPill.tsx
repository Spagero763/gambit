"use client";

import { Wallet, Loader2 } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { CUSD_ADDRESS } from "@/lib/wagmi";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : "";
}

export function WalletPill() {
  const { isMiniPay, ready } = useMiniPay();
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({
    address,
    token: CUSD_ADDRESS,
    query: { enabled: !!address },
  });
  const { open } = useAppKit();
  const [settings] = useSettings();

  if (!ready) return <div className="h-10 w-28 rounded-xl border border-line bg-void-700" />;

  if (isConnected && address) {
    const amount = bal ? Number(bal.formatted).toFixed(2) : "0.00";
    return (
      <button
        onClick={() => open({ view: "Account" })}
        className="flex items-center gap-2 rounded-xl border border-line bg-void-700 py-1.5 pl-2 pr-3 text-left transition-colors hover:border-line-strong"
      >
        <Avatar
          image={settings.avatarImage || undefined}
          color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
          name={settings.name || address.slice(2, 4)}
          size={28}
          rounded="rounded-lg"
        />
        <div className="leading-tight">
          <p className="font-mono text-[11px] text-ink">{short(address)}</p>
          <p className="nums text-[10px] text-teal">{amount} USDm</p>
        </div>
      </button>
    );
  }

  // Inside MiniPay the injected connector auto-connects.
  if (isMiniPay) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-void-700 px-3 py-2 text-xs text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking…
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-glow transition-colors"
    >
      <Wallet className="h-4 w-4" />
      Connect
    </button>
  );
}
