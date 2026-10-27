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
    { sel: '[data-coach="tray"]', text: "Drag a piece from here..." },
    { sel: '[data-coach="board"]', text: "...onto the board. Fill a whole row or column to clear it." },
  ],
  chess: [
    { sel: '[data-coach="board"]', text: "You play white. Tap a pawn, then the square you want it on." },
  ],
  whot: [
    { sel: '[data-coach="pile"]', text: "Match this card by shape or by number." },
    { sel: '[data-coach="hand"]', text: "Your hand. Tap a card that matches. Nothing fits? Tap the market to draw." },
  ],
  snakes: [
    { sel: '[data-coach="dice"]', text: "Roll here." },
    { sel: '[data-coach="board"]', text: "Ladders lift you, snakes drop you. Land exactly on 100 to win." },
  ],
  "tic-tac-toe": [
    { sel: '[data-coach="grid"]', text: "Tap a square. Three in a row wins." },
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

  // the target may not exist yet (game still loading, or a setup screen first), // poll until it appears, then render. Give up after 20s.
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
      <div className="fixed inset-0 z-[115]" style={{ background: rect ? "transparent" : "rgba(0,0,0,0.75)" }}>
        {rect && (
          <div
            className="pointer-events-none absolute rounded-xl"
            style={{
              left: rect.left - pad,
              top: rect.top - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(3,6,10,0.78), 0 0 28px rgba(62,224,155,0.55)",
              border: "2px solid rgba(123,245,193,0.9)",
            }}
          />
        )}

        {rect && (
          <motion.div
            className="pointer-events-none absolute text-won-bright"
            style={{
              left: clamp(rect.left + rect.width / 2 - 10, 8, (typeof window !== "undefined" ? window.innerWidth : 390) - 28),
              ...(below ? { top: rect.bottom + 6 } : { top: rect.top - 26 }),
              rotate: below ? 0 : 180,
            }}
            animate={{ y: below ? [0, 5, 0] : [0, -5, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden>
              <path d="M10 1 19 15H1z" fill="currentColor" />
            </svg>
          </motion.div>
        )}

        <div key={i} className="enter panel absolute rounded-[20px] p-4" style={cardStyle}>
          <p className="text-body text-ink">{s.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={finish} className="text-small font-semibold text-ink-soft">
              Skip
            </button>
            <div className="flex items-center gap-2">
              <span className="nums text-sm text-ink-faint">
                {i + 1}/{steps.length}
              </span>
              <button onClick={next} className="btn-primary h-11 rounded-full px-5 text-small">
                {i >= steps.length - 1 ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
