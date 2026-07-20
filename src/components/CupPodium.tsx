"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, Share2, PartyPopper } from "lucide-react";
import { useAccount } from "wagmi";
import { CupWinner, shareCup } from "@/lib/cupClient";
import { ShareButton } from "@/components/ShareButton";
import { displayName } from "@/lib/handle";
import { inviteUrl } from "@/lib/share";
import { cn } from "@/lib/cn";

const MEDAL = ["🥇", "🥈", "🥉"];
const nameOf = (w: CupWinner) => displayName(w.name, w.address);
// visual order: 2nd, 1st, 3rd, with the champion tallest in the middle
const ORDER = [1, 0, 2];
const HEIGHT = ["h-16", "h-24", "h-12"];

/**
 * Last week's Weekly Cup podium. The prize was already paid automatically at
 * settle; if the connected wallet is one of the three winners, they can post
 * their win and claim a share bonus on top (never a gate — the money is theirs
 * either way). Names shown instead of raw 0x… for a shareable, MiniPay-clean look.
 */
export function CupPodium({ winners, shareBonus, onClaimed }: { winners: CupWinner[]; shareBonus: number; onClaimed?: () => void }) {
  const { address } = useAccount();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!winners.length) return null;
  const meIdx = address ? winners.findIndex((w) => w.address.toLowerCase() === address.toLowerCase()) : -1;
  const me = meIdx >= 0 ? winners[meIdx] : null;
  const claimed = !!me?.shareTx;

  const claim = async () => {
    if (!address || busy) return;
    setMsg(null);
    if (!/^https?:\/\/(x\.com|twitter\.com|mobile\.x\.com)\/[^/]+\/status\/\d+/i.test(url.trim())) {
      setMsg("Paste the link to your X post.");
      return;
    }
    setBusy(true);
    try {
      const r = await shareCup(address, url.trim());
      if (r.ok) {
        setMsg(null);
        onClaimed?.();
      } else {
        setMsg("Could not claim. Try again.");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Could not claim. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const flex = me
    ? `I finished ${MEDAL[meIdx]} in the Gambit Weekly Cup and got paid ${me.amount} USDm. Free to enter, humans only. Come take my spot.`
    : "The Gambit Weekly Cup pays the top 3 every week. Free to enter, humans only. bestgambit.live";

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Last week&apos;s podium</p>

      {/* the podium */}
      <div className="mt-3 flex items-end justify-center gap-2">
        {ORDER.map((rank) => {
          const w = winners[rank];
          if (!w) return null;
          const isMe = meIdx === rank;
          return (
            <div key={w.address} className="flex w-1/3 max-w-[7.5rem] flex-col items-center">
              <span className="text-2xl">{MEDAL[rank]}</span>
              <span className={cn("mt-1 max-w-full truncate text-center text-[12px] font-semibold", isMe ? "text-teal" : "text-ink")}>
                {nameOf(w)}
              </span>
              <span className="text-[11px] font-bold text-teal">+{w.amount} USDm</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className={cn(
                  "mt-1.5 flex w-full items-start justify-center rounded-t-xl border-t border-x pt-1.5 text-[10px] font-black",
                  HEIGHT[rank],
                  rank === 0
                    ? "border-amber/40 bg-gradient-to-b from-amber/25 to-transparent text-amber"
                    : "border-line bg-void-700 text-ink-faint"
                )}
              >
                {rank + 1}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* winner's share-to-claim-bonus flow */}
      {me && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-teal/30 bg-teal/[0.06] p-3.5"
        >
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-teal">
            <PartyPopper className="h-4 w-4" /> You placed {MEDAL[meIdx]} and won {me.amount} USDm
          </p>
          <p className="mt-0.5 text-[11px] text-ink-dim">Already paid to your wallet.</p>

          {claimed ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-teal">
              <Check className="h-3.5 w-3.5" /> Share bonus claimed
            </p>
          ) : shareBonus > 0 ? (
            <div className="mt-2.5">
              <p className="text-[12px] text-ink">
                Post your win on X and claim a <span className="font-bold text-teal">+{shareBonus} USDm</span> bonus.
              </p>
              <ShareButton
                text={flex}
                url={inviteUrl(address)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-void-700 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-teal/40"
              >
                <Share2 className="h-4 w-4" /> Post my win
              </ShareButton>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste your X post link"
                className="mt-2 w-full rounded-xl border border-line bg-void-800 px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink-faint focus:border-teal/40"
              />
              <button
                onClick={claim}
                disabled={busy}
                className="btn-primary mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] shadow-glow disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Claiming…" : `Claim +${shareBonus} USDm`}
              </button>
              {msg && <p className="mt-2 text-center text-[11px] text-rose">{msg}</p>}
            </div>
          ) : (
            <ShareButton
              text={flex}
              url={inviteUrl(address)}
              className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-void-700 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-teal/40"
            >
              <Share2 className="h-4 w-4" /> Share your win
            </ShareButton>
          )}
        </motion.div>
      )}
    </div>
  );
}
