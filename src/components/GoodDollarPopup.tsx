"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, ShieldCheck, Coins, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useGoodDollarClaim } from "@/hooks/useGoodDollarClaim";
import { useGoodId } from "@/hooks/useGoodId";
import { Portal } from "@/components/Portal";
import { Confetti } from "@/components/motion/Confetti";
import { play } from "@/lib/sfx";

const SEEN_KEY = "gambit.gd.popup.v1"; // stores the last yyyy-mm-dd we showed it
const today = () => new Date().toISOString().slice(0, 10);

/**
 * The daily GoodDollar popup. This is the free money tap: GoodDollar funds the
 * UBI and tops up the player's gas, so a brand new wallet goes from unable to
 * transact at all, to holding real G$ it can stake. Shown once a day.
 */
export function GoodDollarPopup() {
  const { address } = useAccount();
  const { state, amount, claim, claiming, error } = useGoodDollarClaim();
  const { verify } = useGoodId();
  const [open, setOpen] = useState(false);
  const [won, setWon] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // once a day, and only when there is actually something to do
  useEffect(() => {
    if (!address) return;
    if (state !== "can_claim" && state !== "needs_verify") return;
    try {
      if (localStorage.getItem(SEEN_KEY) === today()) return;
    } catch {
      /* private mode — just show it */
    }
    const t = setTimeout(() => setOpen(true), 1200); // let the page settle first
    return () => clearTimeout(t);
  }, [address, state]);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, today());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const doClaim = async () => {
    await claim();
    play("win");
    setWon(true);
  };

  if (!open) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="fixed inset-0 z-[130] grid place-items-center bg-void/85 px-6 backdrop-blur-md"
        >
          {won && <Confetti count={60} />}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="relative w-[min(90%,23rem)] rounded-3xl border border-teal/35 bg-void-700 p-6 text-center shadow-pop"
          >
            <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ rotate: -14, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 14, delay: 0.08 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal/15 text-teal"
            >
              <Coins className="h-8 w-8" />
            </motion.div>

            {won ? (
              <>
                <p className="mt-4 font-display text-2xl font-black text-teal">Money claimed</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-dim">
                  Your G$ is in your wallet, and your network fees are covered. You can play a real match now.
                </p>
                <Link
                  href="/lobby"
                  onClick={dismiss}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm shadow-glow"
                >
                  Play someone for it <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={dismiss} className="mt-2 w-full py-2 text-[12px] text-ink-faint hover:text-ink">
                  Maybe later
                </button>
              </>
            ) : state === "needs_verify" ? (
              <>
                <p className="mt-4 font-display text-2xl font-black text-ink">Free money, every day</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-dim">
                  GoodDollar pays real humans a little money daily. Verify once, it is free and takes about a minute, then
                  claim it here every day and use it to play.
                </p>
                <button
                  onClick={async () => {
                    setVerifying(true);
                    try {
                      await verify();
                    } finally {
                      setVerifying(false);
                    }
                  }}
                  disabled={verifying}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm shadow-glow disabled:opacity-60"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify and start claiming
                </button>
                <button onClick={dismiss} className="mt-2 w-full py-2 text-[12px] text-ink-faint hover:text-ink">
                  Not now
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 font-display text-2xl font-black text-ink">Your daily G$ is ready</p>
                {amount > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-lg font-black text-teal">
                    +{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} G$
                  </p>
                )}
                <p className="mt-2 text-[13px] leading-snug text-ink-dim">
                  Free from GoodDollar, straight to your wallet. Your network fees are covered too, so you can play a real
                  match with it right after.
                </p>
                <button
                  onClick={doClaim}
                  disabled={claiming}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm shadow-glow disabled:opacity-60"
                >
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  {claiming ? "Claiming…" : "Claim my G$"}
                </button>
                {error && <p className="mt-2 text-[12px] text-rose">{error}</p>}
                <button onClick={dismiss} className="mt-2 w-full py-2 text-[12px] text-ink-faint hover:text-ink">
                  Later
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
