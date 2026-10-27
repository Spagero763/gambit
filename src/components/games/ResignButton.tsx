"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Portal } from "@/components/Portal";
import { resignMatch } from "@/lib/matchClient";

/**
 * Forfeit a staked match with a hard confirm. Resigning hands the pot to the
 * opponent instantly, so the confirm is a full-width bottom sheet with an
 * unmissable warning and big tap targets, it fits every phone width instead
 * of overflowing the match header, and can't be fat-fingered.
 */
export function ResignButton({ matchId, you }: { matchId: bigint; you: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const resign = async () => {
    setBusy(true);
    try {
      await resignMatch(matchId, you);
      // the game's own poll notices status settled and shows the settle overlay
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Forfeit the match"
        className="glass pressable inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-ink-dim transition-colors hover:text-rose"
      >
        <Flag className="h-3.5 w-3.5" /> Resign
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[130] grid items-end bg-void/70 backdrop-blur-sm sm:place-items-center" onClick={() => !busy && setOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="sheet w-full rounded-t-[30px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-[30px]"
            >
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-rose/15 text-rose">
                <Flag className="h-5 w-5" />
              </span>
              <p className="display mt-3 text-center text-[24px] font-extrabold text-ink">Give up this match?</p>
              <p className="mt-1 text-center text-[16px] leading-snug text-ink-dim">
                Your opponent wins the whole pot, paid to their wallet right away. This can&apos;t be undone.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="btn-primary pressable h-[54px] w-full rounded-full text-[16px] disabled:opacity-60"
                >
                  Keep playing
                </button>
                <button
                  onClick={resign}
                  disabled={busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-rose disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                  Yes, give up. They win.
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </>
  );
}
