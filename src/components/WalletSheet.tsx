"use client";

import { motion } from "framer-motion";
import { X, User as UserIcon, LogOut } from "lucide-react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useInMiniPay, ADD_CASH_URL } from "@/lib/minipay";
import { useStableBalances } from "@/hooks/useStableBalances";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { displayName } from "@/lib/handle";
import { Avatar } from "@/components/Avatar";
import { Portal } from "@/components/Portal";

/**
 * The wallet modal. Tap the wallet chip → see who you are, what you hold, and
 * the deposit path.
 *
 * MiniPay review items 5 & 3 shape this: inside the Mini App there is no Copy,
 * Send, or Withdraw button and no raw 0x… address shown — instead the deposit
 * link opens so players can fund themselves in their own stablecoin (USD₮,
 * USDC, or USDm). On the open web the withdraw path is still there (in
 * Profile), because funds must not be trapped outside MiniPay.
 */
export function WalletSheet({ address, onClose }: { address: `0x${string}`; onClose: () => void }) {
  const { logout } = usePrivy();
  const [settings] = useSettings();
  const miniPay = useInMiniPay();
  const { balances, total, loading } = useStableBalances(address);
  const name = displayName(settings.name, address);

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] grid place-items-center bg-void-900/70 px-4 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-line bg-void-800 p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Your wallet</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:text-ink"><X className="h-5 w-5" /></button>
          </div>

          {/* identity — no raw address, ever */}
          <div className="mt-4 flex items-center gap-3">
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
              name={name}
              size={40}
              rounded="rounded-xl"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <p className="text-[11px] text-ink-faint">Celo wallet</p>
            </div>
          </div>

          {/* balances, all stablecoins; CELO is never surfaced */}
          <p className="mb-2 mt-5 text-xs font-medium text-ink-faint">Balances</p>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.token.address} className="flex items-center justify-between rounded-xl border border-line bg-void-800 px-3.5 py-2.5">
                <span className="text-sm font-medium text-ink">{b.token.symbol}</span>
                <span className="nums text-sm text-ink-dim">{b.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </div>
            ))}
            {loading && <div className="h-9 animate-pulse rounded-xl border border-line bg-void-800" />}
            {total > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-teal/10 px-3.5 py-2.5">
                <span className="text-sm font-medium text-teal">Total</span>
                <span className="nums text-sm font-semibold text-teal">{total.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* in MiniPay the only way money moves in is the Add Cash deeplink */}
          {miniPay && (
            <a
              href={ADD_CASH_URL}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
            >
              Add cash
            </a>
          )}
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            {miniPay
              ? "Add cash in USDT, USDC or USDm. Network fee and deposits are paid in Celo, which you never need to buy."
              : "Your wallet on Celo. Deposit a stablecoin or play a free game."}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <Link href="/profile" onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-dim hover:text-ink">
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </Link>
            {/* nothing to sign out of in MiniPay — the wallet is the app */}
            {!miniPay && (
              <button onClick={() => logout()} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-faint transition-colors hover:text-rose">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
