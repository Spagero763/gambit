"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Confetti } from "@/components/motion/Confetti";
import { cn } from "@/lib/cn";

export type ResultKind = "win" | "lose" | "draw" | null;

const COPY: Record<
  Exclude<ResultKind, null>,
  { title: string; sub: string; tone: string }
> = {
  win: { title: "You take it", sub: "Round yours.", tone: "text-teal" },
  lose: { title: "Not this one", sub: "Deal again.", tone: "text-rose" },
  draw: { title: "Deadlock", sub: "Nobody breaks it. Re-rack.", tone: "text-amber" },
};

export function ResultOverlay({
  result,
  onRematch,
}: {
  result: ResultKind;
  onRematch: () => void;
}) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 grid place-items-center bg-void/70 backdrop-blur-sm"
        >
          {result === "win" && <Confetti />}
          <motion.div
            initial={{ scale: 0.86, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-[min(86%,20rem)] rounded-3xl border border-line bg-void-700 p-6 text-center shadow-pop"
          >
            <p className={cn("text-2xl font-semibold tracking-tight", COPY[result].tone)}>
              {COPY[result].title}
            </p>
            <p className="mt-1 text-sm text-ink-dim">{COPY[result].sub}</p>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={onRematch}
                className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Rematch
              </button>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-void-600 px-4 py-2.5 text-sm font-semibold text-ink-dim transition-colors hover:text-ink"
              >
                <Home className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
