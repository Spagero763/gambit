"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Portal } from "@/components/Portal";

const KEY = "gambit:tour:v2";

interface Step {
  sel?: string; // CSS selector of the element to spotlight (omit for a centered card)
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { title: "Welcome to Gambit 👋", body: "The games you grew up playing, for real money. Warm up free against the bot, then challenge real people. Quick tour, 30 seconds." },
  { sel: '[data-tour="wallet"]', title: "Your money lives here", body: "Think of it as your game account. Tap anytime to see your balance, add money, or send your winnings out. No crypto knowledge needed." },
  { sel: '[data-tour="daily"]', title: "Free money, daily", body: "Come back every day and tap this. You get XP plus a little real G$ paid straight into your wallet. It costs you nothing." },
  { sel: '[data-tour="challenge"]', title: "The Daily Challenge", body: "One board, the whole world plays it, you get one shot at your score. Beat your friends and rub it in." },
  { sel: '[data-tour="games"]', title: "Pick your game", body: "Tap any game to play free. When you're ready, choose Staked 1v1, put money on it, and the winner takes 95% of the pot." },
  { sel: '[data-tour="cups"]', title: "Cups", body: "Tournaments with bigger pots. There's also a free Weekly Cup where verified humans split a real prize." },
  { sel: '[data-tour="ranks"]', title: "Ranks", body: "The leaderboard. Win matches to climb it." },
  { sel: '[data-tour="you"]', title: "You", body: "Your profile, match history, winnings and settings. Tap the ? up top anytime to see this tour again. Now go play!" },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * First-run guided tour. Dims the screen, spotlights one real element at a
 * time with a pointing hand + tooltip, Skip / Next, and only ever runs once
 * (localStorage). Replaces the old static welcome modal with something that
 * actually shows people where things are.
 */
export function Tour() {
  const [step, setStep] = useState(-1);
  const [, force] = useState(0); // re-render on resize/scroll to track the element

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setStep(0), 900); // let the first paint settle
    return () => clearTimeout(t);
  }, []);

  // the header's ? button (or anything else) can reopen the tour anytime
  useEffect(() => {
    const start = () => setStep(0);
    window.addEventListener("gambit:tour", start);
    return () => window.removeEventListener("gambit:tour", start);
  }, []);

  useEffect(() => {
    if (step < 0) return;
    const on = () => force((x) => x + 1);
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [step]);

  if (step < 0) return null;

  const finish = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    setStep(-1);
  };
  const next = () => (step >= STEPS.length - 1 ? finish() : setStep(step + 1));

  const s = STEPS[step];
  const el = s.sel && typeof document !== "undefined" ? document.querySelector(s.sel) : null;
  const rect = el ? el.getBoundingClientRect() : null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 8;
  const below = rect ? rect.top < vh * 0.5 : true; // element high up → tooltip below it

  // Card spans the width (with side margins) and pins below the element when it's
  // up top, else above it — so it's always fully on-screen and the buttons are
  // always tappable on small phones. Centered when there's no target.
  const cardStyle: React.CSSProperties = rect
    ? {
        left: 16,
        right: 16,
        margin: "0 auto",
        maxWidth: 360,
        ...(below ? { top: Math.min(rect.bottom + 20, vh - 200) } : { bottom: Math.min(vh - rect.top + 20, vh - 200) }),
      }
    : { left: 16, right: 16, margin: "0 auto", maxWidth: 360, top: "50%", transform: "translateY(-50%)" };

  return (
    <Portal>
      <div className="fixed inset-0 z-[120]" style={{ background: rect ? "transparent" : "rgba(8,7,18,0.82)" }}>
        {/* spotlight cut-out around the element */}
        {rect && (
          <div
            className="pointer-events-none absolute rounded-xl"
            style={{
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(8,7,18,0.82)",
              border: "2px solid rgba(62,207,142,0.85)",
            }}
          />
        )}

        {/* pointing hand at the element */}
        {rect && (
          <motion.div
            className="pointer-events-none absolute text-2xl"
            style={{
              left: clamp(rect.left + rect.width / 2 - 12, 8, vw - 32),
              ...(below ? { top: rect.bottom + 2 } : { top: rect.top - 34 }),
            }}
            animate={{ y: below ? [0, 6, 0] : [0, -6, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {below ? "👆" : "👇"}
          </motion.div>
        )}

        {/* tooltip card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-2xl border border-line bg-void-800 p-4 shadow-pop"
          style={cardStyle}
        >
          <p className="text-sm font-bold text-ink">{s.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-dim">{s.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={finish} className="text-[12px] font-medium text-ink-faint transition-colors hover:text-ink-dim">
              Skip
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-faint">
                {step + 1}/{STEPS.length}
              </span>
              <button onClick={next} className="btn-primary rounded-xl px-4 py-2 text-[13px] shadow-glow">
                {step >= STEPS.length - 1 ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
