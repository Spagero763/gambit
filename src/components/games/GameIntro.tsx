"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/Portal";

/** Plain-language "how to play" shown once the first time you open each game. */
const INTROS: Record<string, { title: string; lines: string[] }> = {
  chess: {
    title: "How to play Chess",
    lines: [
      "Tap a piece, then tap where to move it.",
      "You're white — you move first.",
      "Trap the enemy king (checkmate) to win — and don't run out the clock!",
    ],
  },
  whot: {
    title: "How to play Naija Whot",
    lines: [
      "Match the top card by shape or number.",
      "Special cards: Pick Two, Hold On, Suspension, General Market.",
      "Whot (20) lets you call any shape. Empty your hand first to win.",
    ],
  },
  "tic-tac-toe": {
    title: "How to play Tic-Tac-Toe",
    lines: [
      "Tap a square to place your mark.",
      "Get three in a row — across, down, or diagonal.",
      "Block your opponent while you build your own line.",
    ],
  },
  snakes: {
    title: "How to play Snakes & Ladders",
    lines: [
      "Tap to roll the dice and move along the board.",
      "Land on a ladder to climb up; a snake slides you down.",
      "First to reach the final square wins.",
    ],
  },
  blocks: {
    title: "How to play Block Blitz",
    lines: [
      "Drag a shape onto the board — or tap a shape, then tap a cell.",
      "Fill a whole row or column to clear it and score.",
      "No moves left = game over. Beat your best score!",
    ],
  },
};

export function GameIntro({ slug }: { slug: string }) {
  const intro = INTROS[slug];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!intro) return;
    try {
      if (localStorage.getItem(`gambit:gameintro:${slug}`)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [slug, intro]);

  if (!intro) return null;

  const close = () => {
    try {
      localStorage.setItem(`gambit:gameintro:${slug}`, "1");
    } catch {
      /* private mode */
    }
    setOpen(false);
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] grid place-items-center bg-void/85 px-6 backdrop-blur-md"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-[min(90%,24rem)] rounded-3xl border border-line bg-void-700 p-6 shadow-pop"
            >
              <button onClick={close} aria-label="Close" className="absolute right-3 top-3 text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
              <p className="text-lg font-bold text-ink">{intro.title}</p>
              <ul className="mt-3 space-y-2.5">
                {intro.lines.map((l, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-dim">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-teal/20 text-[9px] font-bold text-teal">
                      {i + 1}
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
              <button onClick={close} className="btn-primary mt-5 w-full rounded-2xl py-3 text-sm shadow-glow">
                Got it — let&apos;s play
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
