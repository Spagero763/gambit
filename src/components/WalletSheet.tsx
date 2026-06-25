"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check, ArrowUpRight, User as UserIcon, LogOut } from "lucide-react";
import Link from "next/link";
import { useBalance } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { tokensFor } from "@/lib/tokens";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";
import { SendFunds } from "@/components/SendFunds";
import { Portal } from "@/components/Portal";

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** One balance row — native CELO when `token` is undefined, else an ERC-20. */
function BalanceRow({ address, token, symbol }: { address: `0x${string}`; token?: `0x${string}`; symbol: string }) {
  const { data } = useBalance({ address, token, query: { enabled: !!address } });
  const v = data ? Number(data.formatted) : 0;
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-void-800 px-3.5 py-2.5">
      <span className="text-sm font-medium text-ink">{symbol}</span>
      <span className="nums text-sm text-ink-dim">{v.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
    </div>
  );
}

/**
 * The wallet modal Privy doesn't provide: tap the wallet chip → see your
 * address, balances, and Withdraw. Mirrors the "tap wallet → manage" pattern
 * people know from WalletConnect, so the cash-out path is obvious.
 */
export function WalletSheet({ address, onClose }: { address: `0x${string}`; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const { logout } = usePrivy();
  const [settings] = useSettings();
  const tokens = tokensFor(ACTIVE_CHAIN_ID);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  if (withdraw) return <SendFunds address={address} onClose={() => setWithdraw(false)} />;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-void-900/70 px-4 pt-20 backdrop-blur-sm sm:pt-24" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-line bg-void-800 p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Your wallet</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:text-ink"><X className="h-5 w-5" /></button>
          </div>

          {/* identity + address */}
          <div className="mt-4 flex items-center gap-3">
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
              name={settings.name || address.slice(2, 4)}
              size={40}
              rounded="rounded-xl"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{settings.name || "Your account"}</p>
              <button onClick={copy} className="group inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-faint hover:text-ink">
                {short(address)}
                {copied ? <Check className="h-3 w-3 text-teal" /> : <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
              </button>
            </div>
          </div>

          {/* balances */}
          <p className="mb-2 mt-5 text-xs font-medium text-ink-faint">Balances</p>
          <div className="space-y-2">
            <BalanceRow address={address} symbol="CELO" />
            {tokens.map((t) => (
              <BalanceRow key={t.address} address={address} token={t.address} symbol={t.symbol} />
            ))}
          </div>

          {/* actions */}
          <button
            onClick={() => setWithdraw(true)}
            className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw / Send
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-faint">Cash out your G$/USDm to any wallet or exchange.</p>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <Link href="/profile" onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-dim hover:text-ink">
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </Link>
            <button onClick={() => logout()} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-faint transition-colors hover:text-rose">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
