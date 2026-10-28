"use client";

import { createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { sheetEase } from "@/lib/motion";
import { Confetti } from "@/components/ui/Confetti";

export type ResultKind = "win" | "lose" | "draw" | null;

/** Set by the practice screen when the game also has money matches. */
export const MoneyNudge = createContext<(() => void) | undefined>(undefined);

const COPY: Record<Exclude<ResultKind, null>, { title: string; sub: string }> = {
  win: { title: "You won", sub: "Ready to play a real person?" },
  lose: { title: "Not this time", sub: "Run it back." },
  draw: { title: "Draw", sub: "Nobody broke through." },
};

/** End of a practice game. */
export function ResultOverlay({
  result,
  onRematch,
  onExit,
}: {
  result: ResultKind;
  onRematch: () => void;
  onExit?: () => void;
}) {
  const onMoney = useContext(MoneyNudge);
  const nudge = result === "win" && onMoney;
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] flex items-end bg-black/60"
        >
          {result === "win" && <Confetti />}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.36, ease: sheetEase }}
            className="mx-auto w-full max-w-md sheet rounded-t-sheet px-5 pb-[calc(24px+var(--safe-b))] pt-6"
          >
            <p className={`display text-[42px] font-extrabold leading-none ${result === "win" ? "text-glow" : "text-ink"}`}>
              {COPY[result].title}
            </p>
            <p className="mt-2 text-body text-ink-soft">{COPY[result].sub}</p>
            <div className="mt-6 grid gap-2.5">
              {nudge && <Button onClick={onMoney}>Try 1v1 for money</Button>}
              <Button variant={nudge ? "secondary" : "primary"} onClick={onRematch}>
                Play again
              </Button>
              {onExit && (
                <Button variant={nudge ? "ghost" : "secondary"} onClick={onExit}>
                  Done
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
