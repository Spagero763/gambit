"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { useAccount } from "wagmi";
import { useProgress, levelInfo } from "@/lib/progress";
import { useProfile } from "@/lib/profile";

const DISMISS_KEY = "gambit:saveprompt:dismissed";

/**
 * Nudges a player to create a profile once they have progress worth keeping.
 * Without a profile, XP / wins / streak live only in this browser and vanish
 * if storage clears or they switch devices; a profile (one free signature)
 * pins them to their wallet and syncs everywhere — and onto the leaderboards.
 */
export function SaveProgressPrompt() {
  const p = useProgress();
  const { isConnected } = useAccount();
  const { hasProfile, loading } = useProfile();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  // worth saving once they've built something up — or as soon as they connect
  // a wallet (clear intent) without a profile yet
  const hasProgress = p.played >= 1 || p.xp >= 50 || p.streak >= 1;
  const show = !dismissed && !loading && !hasProfile && (hasProgress || isConnected);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const lvl = levelInfo(p.xp);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative mx-auto mt-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-teal/35 bg-teal/[0.07] p-4"
        >
          <button onClick={close} aria-label="Dismiss" className="absolute right-2.5 top-2.5 text-ink-faint transition-colors hover:text-ink">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">Save your progress before you lose it</p>
              <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
                You&apos;re <span className="font-semibold text-ink">Level {lvl.level}</span> with{" "}
                <span className="nums font-semibold text-ink">{p.xp.toLocaleString()} XP</span>
                {p.streak > 0 ? <> and a <span className="font-semibold text-amber">{p.streak}-day streak</span></> : null}. Right now that lives
                only in this browser. Create a profile (one free signature, no gas) to pin it to your wallet, sync across devices, and appear on
                the leaderboards.
              </p>
              <Link
                href="/profile"
                className="btn-primary mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] shadow-glow"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Create your profile
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
