"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { resignMatch } from "@/lib/matchClient";

/**
 * Forfeit a staked match with a hard confirm. Resigning hands the pot to the
 * opponent instantly, so the first tap only arms the button — the second tap,
 * on an unmissable warning, actually resigns. Rendered by every staked game.
 */
export function ResignButton({ matchId, you }: { matchId: bigint; you: string }) {
  const [arm, setArm] = useState(false);
  const [busy, setBusy] = useState(false);

  const resign = async () => {
    setBusy(true);
    try {
      await resignMatch(matchId, you);
      // the game's own poll notices status settled and shows the settle overlay
    } finally {
      setBusy(false);
      setArm(false);
    }
  };

  if (arm) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={resign}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose/20 px-2.5 py-1.5 text-[12px] font-semibold text-rose transition-colors hover:bg-rose/30 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
          Forfeit? Opponent wins the pot
        </button>
        <button
          onClick={() => setArm(false)}
          disabled={busy}
          className="rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
        >
          Keep playing
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setArm(true)}
      title="Forfeit the match"
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-faint transition-colors hover:border-rose/40 hover:text-rose"
    >
      <Flag className="h-3.5 w-3.5" /> Resign
    </button>
  );
}
