"use client";

import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useProgress, levelInfo } from "@/lib/progress";
import { useRankUp } from "@/lib/useRankUp";
import { RankBadge } from "@/components/RankBadge";
import { Confetti } from "@/components/motion/Confetti";
import { Portal } from "@/components/Portal";
import { inviteUrl, shareOrCopy } from "@/lib/share";

/**
 * Full-screen moment when a player crosses into a new rank tier: confetti, the
 * big rank emblem springing in, and a share button. This is the retention
 * payoff of the rank ladder — the dopamine hit that makes the next match matter.
 * Mounted once, globally (see LayoutExtras).
 */
export function RankUpCelebration() {
  const p = useProgress();
  const { rankedUp, dismiss } = useRankUp(p);
  const { address } = useAccount();

  if (!rankedUp) return null;
  const level = levelInfo(p.xp).level;

  const share = () =>
    shareOrCopy({
      title: "Gambit",
      text: `Just ranked up to ${rankedUp.name} on Gambit! Level ${level}. Come play me.`,
      url: inviteUrl(address),
    });

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={dismiss}
        className="fixed inset-0 z-[125] grid place-items-center bg-void/85 px-6 backdrop-blur-sm"
      >
        <Confetti count={64} />
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.82, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="relative w-full max-w-xs rounded-3xl border p-7 text-center shadow-pop"
          style={{ borderColor: `${rankedUp.color}55`, background: `linear-gradient(160deg, ${rankedUp.glow}, transparent 70%)` }}
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            className="mx-auto w-fit"
          >
            <RankBadge rank={rankedUp} size={92} />
          </motion.div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: rankedUp.color }}>
            Rank up
          </p>
          <p className="mt-1 font-display text-3xl font-black text-ink">{rankedUp.name}</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">
            You climbed to {rankedUp.name}. Keep winning to reach {rankedUp.next?.name ?? "the very top"}.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={share}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
            >
              <Share2 className="h-4 w-4" /> Show it off
            </button>
            <button onClick={dismiss} className="rounded-xl border border-line bg-void-800 py-3 text-sm text-ink-dim transition-colors hover:text-ink">
              Keep playing
            </button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
