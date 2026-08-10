"use client";

import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { rankForXp } from "@/lib/rank";
import { displayName } from "@/lib/handle";
import { useInMiniPay } from "@/lib/minipay";
import { useStableBalances } from "@/hooks/useStableBalances";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { WalletSheet } from "@/components/WalletSheet";

/**
 * The identity chip.
 *
 * Two rules from the MiniPay review shape this:
 *  - Inside MiniPay the player is already signed in the moment they land, so
 *    there is no "Sign in" button to show. We key off the wagmi address (which
 *    MiniPayConnect wires up on load) instead of Privy's `authenticated`, which
 *    stays false for an injected wallet and used to leave a stray Sign in button.
 *  - A raw 0x… address is never the primary identifier. We show the profile name,
 *    falling back to a stable generated handle, which also keeps the chip narrow
 *    enough that it cannot crowd the wordmark on a 360px screen.
 */
export function WalletPill() {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();
  const miniPay = useInMiniPay();
  const { preferred } = useStableBalances(address);
  const [settings] = useSettings();
  const [open, setOpen] = useState(false);
  const progress = useProgress();
  const rank = rankForXp(progress.xp);

  if (!ready) return <div className="h-9 w-24 rounded-xl border border-line bg-void-700 min-[380px]:h-10 min-[380px]:w-28" />;

  // a connected wallet is all we need — injected (MiniPay) or Privy embedded
  if (address) {
    const name = displayName(settings.name, address);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          data-tour="wallet"
          className="flex max-w-[46vw] items-center gap-2 rounded-xl border border-line bg-void-700 py-1.5 pl-2 pr-2.5 text-left transition-colors hover:border-line-strong min-[380px]:max-w-none min-[380px]:pr-3"
        >
          <span className="relative shrink-0">
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
              name={name}
              size={26}
              rounded="rounded-lg"
            />
            <span className="absolute -bottom-1 -right-1">
              <RankBadge rank={rank} size={14} />
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-medium text-ink">{name}</p>
            <p className="nums text-[10px] text-teal">
              {preferred.amount.toFixed(2)} {preferred.token.symbol}
            </p>
          </div>
        </button>
        {open && <WalletSheet address={address} onClose={() => setOpen(false)} />}
      </>
    );
  }

  // signed in but the embedded wallet is still provisioning
  if (authenticated) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-void-700 px-3 py-2 text-xs text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up…
      </div>
    );
  }

  // inside MiniPay the connection lands on its own, so wait quietly rather than
  // offering a sign in the player does not need
  if (miniPay) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-void-700 px-3 py-2 text-xs text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="btn-primary flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-glow transition-colors min-[380px]:px-4"
    >
      <Wallet className="h-4 w-4" />
      Sign in
    </button>
  );
}
