"use client";

import { useEffect, useRef, useState } from "react";
import { Progress, loadProgress } from "@/lib/progress";
import { rankForXp, type RankState } from "@/lib/rank";

// Highest rank tier the player has already been shown, so we celebrate each
// tier crossing exactly once and never fire for the rank a returning player
// already holds.
const KEY = "gambit:rank:seen";

function loadSeen(): number {
  if (typeof window === "undefined") return -1;
  try {
    const v = localStorage.getItem(KEY);
    return v == null ? -1 : Number(v);
  } catch {
    return -1;
  }
}
function saveSeen(idx: number) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, String(idx));
    } catch {
      /* private mode */
    }
  }
}

/** Fires once when the player crosses into a higher rank tier. */
export function useRankUp(p: Progress): { rankedUp: RankState | null; dismiss: () => void } {
  const [rankedUp, setRankedUp] = useState<RankState | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      // seed from the REAL stored progress, not the hook's default snapshot,
      // so an existing player isn't congratulated for a rank they already hold
      const idx = rankForXp(loadProgress().xp).index;
      if (loadSeen() < idx) saveSeen(idx);
      return;
    }
    const cur = rankForXp(p.xp);
    if (cur.index > loadSeen()) {
      saveSeen(cur.index);
      setRankedUp(cur);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.xp]);

  return { rankedUp, dismiss: () => setRankedUp(null) };
}
