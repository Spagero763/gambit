"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Portal } from "@/components/Portal";
import { resignMatch } from "@/lib/matchClient";

/**
 * Forfeit a staked match with a hard confirm. Resigning hands the pot to the
 * opponent instantly, so the confirm is a full-width bottom sheet with an
 * unmissable warning and big tap targets — it fits every phone width instead
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-faint transition-colors hover:border-rose/40 hover:text-rose"
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
              className="w-full rounded-t-3xl border border-rose/25 bg-void-800 p-5 shadow-pop sm:max-w-sm sm:rounded-3xl"
            >
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-rose/15 text-rose">
                <Flag className="h-5 w-5" />
              </span>
              <p className="mt-3 text-center text-base font-bold text-ink">Forfeit this match?</p>
              <p className="mt-1 text-center text-[13px] leading-snug text-ink-dim">
                Your opponent wins the whole pot, paid to their wallet right away. This can&apos;t be undone.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={resign}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose/20 py-3 text-sm font-semibold text-rose transition-colors hover:bg-rose/30 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                  Yes, forfeit. They win.
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="btn-primary w-full rounded-xl py-3 text-sm shadow-glow disabled:opacity-60"
                >
                  Keep playing
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </>
  );
}
