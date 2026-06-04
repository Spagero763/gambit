"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";
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
          <motion.div
            initial={{ scale: 0.86, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-[min(86%,20rem)] rounded-3xl glass p-6 text-center shadow-card"
          >
            <p className={cn("font-display text-2xl font-bold", COPY[result].tone)}>
              {COPY[result].title}
            </p>
            <p className="mt-1 text-sm text-ink-dim">{COPY[result].sub}</p>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={onRematch}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-deep to-violet py-2.5 text-sm font-semibold text-white shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Rematch
              </button>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold text-ink-dim"
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
