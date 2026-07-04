"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Portal } from "@/components/Portal";

/**
 * On-board coach: the first time you open a game, it dims the screen, spotlights
 * the real element you act on (tray, board, your hand, the dice…) with a pointing
 * hand and a short instruction, and walks the first moves. Tap Next to advance;
 * runs once per game (localStorage). Targets stable containers via data-coach so
 * it doesn't break as pieces move.
 */
interface CoachStep {
  sel: string;
  text: string;
}

const STEPS: Record<string, CoachStep[]> = {
  blocks: [
    { sel: '[data-coach="tray"]', text: "Press and drag a shape from here…" },
    { sel: '[data-coach="board"]', text: "…onto the board. Fill a whole row or column to clear it and score." },
  ],
  chess: [
    { sel: '[data-coach="board"]', text: "Tap a center pawn, then tap two squares forward to make your first move. You're white." },
  ],
  whot: [
    { sel: '[data-coach="pile"]', text: "This is the card to match — by shape or number." },
    { sel: '[data-coach="hand"]', text: "Your cards. Tap a matching one to play it. No match? Draw from the market." },
  ],
  snakes: [
    { sel: '[data-coach="dice"]', text: "Tap here to roll the dice and move." },
    { sel: '[data-coach="board"]', text: "Ladders shoot you up, snake heads slide you down. First to the top wins." },
  ],
  "tic-tac-toe": [
    { sel: '[data-coach="grid"]', text: "Tap the center square first, then build three in a row to win." },
  ],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function BoardCoach({ slug }: { slug: string }) {
  const steps = STEPS[slug];
  const [i, setI] = useState(-1);
  const [, force] = useState(0); // re-render on resize/scroll to track the element

  useEffect(() => {
    if (!steps) return;
    try {
      if (localStorage.getItem(`gambit:coach:${slug}`)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setI(0), 700); // let the board paint first
    return () => clearTimeout(t);
  }, [slug, steps]);

  useEffect(() => {
    if (i < 0) return;
    const on = () => force((x) => x + 1);
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [i]);

  // the target may not exist yet (game still loading, or a setup screen first) —
  // poll until it appears, then render. Give up after 20s.
  useEffect(() => {
    if (i < 0 || !steps) return;
    const sel = steps[i].sel;
    if (typeof document !== "undefined" && document.querySelector(sel)) return;
    const id = setInterval(() => {
      if (document.querySelector(sel)) {
        force((x) => x + 1);
        clearInterval(id);
      }
    }, 400);
    const stop = setTimeout(() => clearInterval(id), 20000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [i, steps]);

  if (!steps || i < 0) return null;

  const finish = () => {
    try {
      localStorage.setItem(`gambit:coach:${slug}`, "1");
    } catch {
      /* private mode */
    }
    setI(-1);
  };
  const next = () => (i >= steps.length - 1 ? finish() : setI(i + 1));

  const s = steps[i];
  const el = typeof document !== "undefined" ? document.querySelector(s.sel) : null;
  const rect = el ? el.getBoundingClientRect() : null;
  if (!rect) return null; // wait for the element (the poll above re-renders us)
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 8;
  const below = rect ? rect.top < vh * 0.45 : true; // element high → caption below it

  // caption spans the width with side margins, pinned clear of the element, so
  // it's always fully on-screen and the Next button is reachable on mobile.
  const cardStyle: React.CSSProperties = rect
    ? {
        left: 16,
        right: 16,
        margin: "0 auto",
        maxWidth: 360,
        ...(below ? { top: Math.min(rect.bottom + 18, vh - 190) } : { bottom: Math.min(vh - rect.top + 18, vh - 190) }),
      }
    : { left: 16, right: 16, margin: "0 auto", maxWidth: 360, top: "50%", transform: "translateY(-50%)" };

  return (
    <Portal>
      <div className="fixed inset-0 z-[115]" style={{ background: rect ? "transparent" : "rgba(8,7,18,0.8)" }}>
        {rect && (
          <div
            className="pointer-events-none absolute rounded-xl"
            style={{
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(8,7,18,0.8)",
              border: "2px solid rgba(62,207,142,0.9)",
            }}
          />
        )}

        {rect && (
          <motion.div
            className="pointer-events-none absolute"
            style={{
              left: clamp(rect.left + rect.width / 2 - 8, 8, (typeof window !== "undefined" ? window.innerWidth : 390) - 24),
              ...(below ? { top: rect.bottom + 4 } : { top: rect.top - 16 }),
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              ...(below ? { borderBottom: "11px solid #3ecf8e" } : { borderTop: "11px solid #3ecf8e" }),
              filter: "drop-shadow(0 2px 5px rgba(62,207,142,0.55))",
            }}
            animate={{ y: below ? [0, 7, 0] : [0, -7, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-2xl border border-line bg-void-800 p-4 shadow-pop"
          style={cardStyle}
        >
          <p className="text-[13px] leading-snug text-ink">{s.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={finish} className="text-[12px] font-medium text-ink-faint transition-colors hover:text-ink-dim">
              Skip
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-faint">
                {i + 1}/{steps.length}
              </span>
              <button onClick={next} className="btn-primary rounded-xl px-4 py-2 text-[13px] shadow-glow">
                {i >= steps.length - 1 ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
