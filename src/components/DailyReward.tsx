"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Flame, X, Sparkles, Loader2 } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useProgress, claimDailyReward, rewardClaimable, levelInfo } from "@/lib/progress";
import { getToken, signIn } from "@/lib/profile";
import { Confetti } from "@/components/motion/Confetti";
import { Portal } from "@/components/Portal";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

/**
 * The daily-return hook: a free reward, claimable once a day, that grants XP
 * (which lifts you on the Points leaderboard) and grows with your streak.
 * Glows on the home screen when ready; opens a satisfying reveal when claimed.
 */
export function DailyReward() {
  const p = useProgress();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { ready, authenticated, login } = usePrivy();
  const claimable = rewardClaimable(p);
  const [reveal, setReveal] = useState<{ reward: number; day: number; g?: number; gReason?: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lvl = levelInfo(p.xp);

  const claim = async () => {
    if (!ready || claiming) return;
    setError(null);

    // wallet must be connected first — the reward is real G$, it needs a wallet
    // to land in. No wallet, no claim: open the sign-in instead of granting XP.
    if (!authenticated || !address) {
      login();
      return;
    }

    setClaiming(true);
    try {
      // free, gasless signature to prove the wallet if we don't have a session yet
      let token = getToken(address);
      if (!token) token = await signIn(address, (a) => signMessageAsync({ message: a.message }));

      // the server holds this request open until the G$ is actually mined into
      // the wallet, so by the time it returns the reward has truly landed.
      const r = await fetch("/api/claim/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      const g = Number(d?.gAmount) || 0;
      const reason: string | undefined = d?.reason;

      if (g > 0 || reason === "already") {
        // reward confirmed in the wallet — only now grant the XP + streak and reveal
        const res = claimDailyReward();
        if (res) {
          play("win");
          setReveal({ reward: res.reward, day: res.day, g, gReason: reason });
        }
      } else if (reason === "blocked") {
        setError("This account is blocked from rewards.");
      } else {
        // treasury empty / send failed / signature issue: don't burn the day, let them retry
        setError(`${gReasonText(reason)}. Tap to try again.`);
      }
    } catch {
      setError("Could not reach the reward. Check your connection and try again.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      {claimable ? (
        <div className="mx-auto mt-4 w-full max-w-2xl">
        <motion.button
          onClick={claim}
          disabled={claiming}
          data-tour="daily"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: claiming ? 1 : 0.98 }}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-amber/40 px-4 py-3.5 text-left shadow-glow disabled:cursor-default"
          style={{ background: "linear-gradient(110deg, rgba(227,179,65,0.16), rgba(62,207,142,0.10) 60%, rgba(227,179,65,0.16))" }}
        >
          {/* shine sweep */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <motion.span
            animate={claiming ? { scale: 1, rotate: 0 } : { rotate: [0, -10, 10, -6, 0], scale: [1, 1.08, 1] }}
            transition={claiming ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/20 text-amber"
          >
            {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">
              {claiming ? "Sending your reward" : "Daily reward ready 🎁"}
            </span>
            <span className="block text-[12px] text-ink-dim">
              {claiming
                ? "Waiting for your G$ to land in your wallet…"
                : !authenticated
                  ? "Connect your wallet to claim XP and G$"
                  : p.streak > 0
                    ? `Day ${p.streak + (p.lastPlayed === today() ? 0 : 1)}. Tap to claim your XP and G$`
                    : "Tap to claim free XP and G$, and start a streak"}
            </span>
          </span>
          <span className="rounded-full bg-amber px-3 py-1.5 text-[12px] font-bold text-void">
            {claiming ? "…" : !authenticated ? "Connect" : "Claim"}
          </span>
        </motion.button>
        {error && <p className="mt-2 px-1 text-center text-[12px] font-medium text-rose">{error}</p>}
        </div>
      ) : (
        <div data-tour="daily" className="mx-auto mt-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-line bg-void-800 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600 text-ink-faint">
            <Gift className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">Reward claimed. Back tomorrow</span>
            <span className="flex items-center gap-2 text-[11px] text-ink-faint">
              <span className="inline-flex items-center gap-1 text-amber"><Flame className="h-3 w-3" /> {p.streak} day streak</span>
              <span>·</span>
              <span className="text-teal">Lv {lvl.level}</span>
            </span>
          </span>
        </div>
      )}

      {/* reveal — portaled to <body> so it centers on the viewport, not under the fold */}
      <Portal>
      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] grid place-items-center bg-void/85 px-6 backdrop-blur-md"
            onClick={() => setReveal(null)}
          >
            <Confetti count={50} />
            <motion.div
              initial={{ scale: 0.7, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-[min(88%,22rem)] rounded-3xl border border-amber/40 bg-void-700 p-7 text-center shadow-pop"
            >
              <button onClick={() => setReveal(null)} aria-label="Close" className="absolute right-3 top-3 text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
              <motion.div
                initial={{ rotate: -18, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber/20 text-amber"
              >
                <Gift className="h-8 w-8" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 inline-flex items-center gap-1.5 font-display text-4xl font-black tracking-tight text-teal"
              >
                <Sparkles className="h-6 w-6 text-amber" /> +{reveal.reward} XP
              </motion.p>
              {reveal.g ? (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 240, damping: 16 }}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-lg font-black text-teal"
                >
                  + {reveal.g} G$ 💚
                </motion.p>
              ) : reveal.gReason ? (
                <p className="mt-1 text-[12px] text-ink-faint">G$ reward: {gReasonText(reveal.gReason)}</p>
              ) : (
                <p className="mt-1 text-[12px] text-ink-faint">checking your G$ reward…</p>
              )}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 text-sm text-ink-dim">
                Day {reveal.day} streak 🔥 — come back tomorrow for more.
              </motion.p>
              <button onClick={() => setReveal(null)} className="btn-primary mt-6 w-full rounded-2xl py-3 text-sm shadow-glow">
                Nice!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}

/** Friendly explanation when the G$ side of the daily reward didn't pay. */
function gReasonText(reason?: string) {
  switch (reason) {
    case "already":
      return "already claimed today, back tomorrow";
    case "sign":
    case "signin":
      return "approve the free signature to claim it";
    case "send-failed":
      return "couldn't send right now, try again";
    case "treasury-empty":
      return "today's pool is empty";
    case "blocked":
      return "this account is blocked from rewards";
    case "no-treasury":
    case "treasury-error":
      return "temporarily unavailable";
    case "no-profile":
      return "save a profile to claim G$";
    default:
      return "unavailable";
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
