"use client";

import { useEffect, useState } from "react";
import { Loader2, AlarmClock } from "lucide-react";
import { claimWin, TURN_TIMEOUT_MS } from "@/lib/matchClient";

/**
 * Anti-abandonment: if the opponent is to move but goes idle past the timeout
 * (device off, closed app, ragequit), the waiting player can claim the win.
 * Renders nothing on your own turn or when the match isn't active.
 */
export function TimeoutClaim({
  matchId,
  me,
  turn,
  updatedAt,
  status,
}: {
  matchId: bigint;
  me: string;
  turn?: string | null;
  updatedAt?: string | null;
  status?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (status !== "active" || !turn || !updatedAt) return null;
  if (turn.toLowerCase() === me.toLowerCase()) return null; // your move — no claim

  const remaining = Math.max(0, TURN_TIMEOUT_MS - (now - new Date(updatedAt).getTime()));
  const canClaim = remaining <= 0;

  return (
    <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-xl border border-line bg-void-800 px-3 py-2 text-[12px]">
      <AlarmClock className="h-3.5 w-3.5 text-ink-faint" />
      {canClaim ? (
        <>
          <span className="text-ink-dim">Opponent didn&apos;t move.</span>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              const r = await claimWin(matchId, me);
              if (!r.ok && r.error) setErr(r.error);
              setBusy(false);
            }}
            className="btn-primary rounded-lg px-3 py-1 text-[12px] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Claim win"}
          </button>
          {err && <span className="text-rose">{err}</span>}
        </>
      ) : (
        <span className="nums text-ink-faint">Opponent to move · claim in {Math.ceil(remaining / 1000)}s</span>
      )}
    </div>
  );
}
