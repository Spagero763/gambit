"use client";

import { Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { CUSD_ADDRESS } from "@/lib/wagmi";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : "";
}

export function WalletPill() {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();
  const { data: bal } = useBalance({ address, token: CUSD_ADDRESS, query: { enabled: !!address } });
  const [settings] = useSettings();

  if (!ready) return <div className="h-10 w-28 rounded-xl border border-line bg-void-700" />;

  // signed in (email/social/wallet) and the wallet is wired into wagmi
  if (authenticated && address) {
    const amount = bal ? Number(bal.formatted).toFixed(2) : "0.00";
    return (
      <Link
        href="/profile"
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
      </Link>
    );
  }

  // logged in but the embedded wallet is still provisioning
  if (authenticated && !address) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-void-700 px-3 py-2 text-xs text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up…
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-glow transition-colors"
    >
      <Wallet className="h-4 w-4" />
      Sign in
    </button>
  );
}
