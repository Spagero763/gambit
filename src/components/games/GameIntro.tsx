"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/Portal";

/** Your first 3 moves — an action guide shown once the first time you open each game. */
const INTROS: Record<string, { title: string; lines: string[] }> = {
  chess: {
    title: "Chess — your first moves",
    lines: [
      "Tap a center pawn, then tap two squares forward to open up.",
      "Bring out a knight (the horse) toward the middle.",
      "Get a bishop out, then castle (king two squares to a rook) to stay safe.",
    ],
  },
  whot: {
    title: "Naija Whot — your first moves",
    lines: [
      "Tap a card in your hand that matches the top card's shape or number.",
      "No match? Tap the market pile to draw a card.",
      "Save specials (Pick Two, Whot 20) — empty your hand first to win.",
    ],
  },
  "tic-tac-toe": {
    title: "Tic-Tac-Toe — your first moves",
    lines: [
      "Tap the center square first — it's the strongest spot.",
      "Grab a corner next to set up two ways to win.",
      "Block your opponent the moment they get two in a row.",
    ],
  },
  snakes: {
    title: "Snakes & Ladders — your first moves",
    lines: [
      "Tap to roll the dice and move forward.",
      "Land on a ladder's base to shoot up the board.",
      "Dodge snake heads — they slide you back down. First to the top wins.",
    ],
  },
  blocks: {
    title: "Block Blitz — your first moves",
    lines: [
      "Drag a shape from the tray onto the board (or tap a shape, then a cell).",
      "Fill a whole row or column to clear it and score.",
      "Leave room — if no shape fits anywhere, it's game over.",
    ],
  },
};

export function GameIntro({ slug }: { slug: string }) {
  const intro = INTROS[slug];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!intro) return;
    try {
      if (localStorage.getItem(`gambit:gameintro2:${slug}`)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [slug, intro]);

  if (!intro) return null;

  const close = () => {
    try {
      localStorage.setItem(`gambit:gameintro2:${slug}`, "1");
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
              <p className="text-lg font-bold text-ink">👆 {intro.title}</p>
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
