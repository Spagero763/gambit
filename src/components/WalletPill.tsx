"use client";

import { useState } from "react";
import { Wallet, Loader2, RotateCcw } from "lucide-react";
import { useWalletReach } from "@/hooks/useWalletReach";
import { useAccount } from "wagmi";
import { useAuth } from "@/lib/auth";
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
  const { ready, authenticated, login } = useAuth();
  const { address } = useAccount();
  const miniPay = useInMiniPay();
  const reach = useWalletReach();
  const { preferred } = useStableBalances(address);
  const [settings] = useSettings();
  const [open, setOpen] = useState(false);
  const progress = useProgress();
  const rank = rankForXp(progress.xp);

  if (!ready) return <div className="glass h-11 w-24 rounded-full min-[380px]:w-28" />;

  // a connected wallet is all we need, injected (MiniPay) or Privy embedded
  if (address) {
    const name = displayName(settings.name, address);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          data-tour="wallet"
          className="glass pressable flex h-11 max-w-[46vw] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left min-[380px]:max-w-none"
        >
          <span className="relative shrink-0">
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
              name={name}
              size={30}
              rounded="rounded-full"
            />
            <span className="absolute -bottom-1 -right-1">
              <RankBadge rank={rank} size={14} />
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
            <p className="nums flex items-center gap-1 text-[14px] font-semibold text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(62,224,155,0.9)]" />
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
      <div className="glass flex h-11 items-center gap-2 rounded-full px-3.5 text-sm text-ink-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up…
      </div>
    );
  }

  // inside MiniPay the connection lands on its own, so wait quietly rather than
  // offering a sign in the player does not need; speak up only if it fails
  if (miniPay) {
    return reach.failed ? (
      <button role="alert" onClick={reach.retry} className="glass pressable flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-rose">
        <RotateCcw className="h-4 w-4" /> Retry wallet
      </button>
    ) : (
      <div aria-hidden className="glass h-11 w-28 animate-pulse rounded-full" />
    );
  }

  return (
    <button
      onClick={() => login()}
      className="btn-primary flex h-11 items-center gap-2 rounded-full px-4 text-sm"
    >
      <Wallet className="h-4 w-4" />
      Sign in
    </button>
  );
}
