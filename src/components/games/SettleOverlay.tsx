"use client";

import { useState } from "react";
import { Loader2, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { retrySettle } from "@/lib/matchClient";
import { useStakeMatch } from "@/hooks/useStakeMatch";
import { cn } from "@/lib/cn";

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

/**
 * End-of-match result + on-chain payout state. While the pot is still settling
 * we do NOT offer "Back to lobby" — the winner's money must land first. We show
 * the real settle error and a Retry button so a stuck payout can be recovered.
 */
export function SettleOverlay({
  result,
  status,
  settleTx,
  settleError,
  chainId,
  matchId,
}: {
  result: "win" | "lose" | "draw";
  status: string; // "settling" | "settled"
  settleTx?: string | null;
  settleError?: string | null;
  chainId?: number;
  matchId: bigint;
}) {
  const settling = status === "settling";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { reclaimStalled, error: reclaimError } = useStakeMatch();
  const [reclaiming, setReclaiming] = useState(false);

  const retry = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await retrySettle(matchId);
      if (!r.settled) setMsg(r.error ?? "Still not settled — try again in a moment.");
      // on success the realtime subscription flips status to "settled"
    } catch (e: any) {
      setMsg(e?.message ?? "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center">
      <p className={cn("text-3xl font-black tracking-tight", result === "draw" ? "text-amber" : result === "win" ? "text-teal" : "text-rose")}>
        {result === "draw" ? "Draw" : result === "win" ? "You win" : "You lose"}
      </p>

      {settling ? (
        <div className="mt-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {result === "draw" ? "Refunding…" : "Paying out…"}
          </p>
          {(settleError || msg) && (
            <p className="mx-auto mt-2 max-w-[16rem] text-[11px] leading-snug text-rose">{msg || settleError}</p>
          )}
          <button
            onClick={retry}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-line bg-void-700 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-void-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {busy ? "Settling…" : "Retry payout"}
          </button>
          <p className="mx-auto mt-3 max-w-[16rem] text-[10px] leading-snug text-ink-faint">
            Your stake is safe in escrow until this settles.
          </p>
          <button
            onClick={async () => {
              setReclaiming(true);
              await reclaimStalled(matchId);
              setReclaiming(false);
            }}
            disabled={reclaiming}
            className="mx-auto mt-2 block text-[11px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-60"
          >
            {reclaiming ? "Reclaiming…" : "Still stuck? Reclaim stakes (refund both, after 1h)"}
          </button>
          {reclaimError && <p className="mx-auto mt-1 max-w-[16rem] text-[10px] text-rose">{reclaimError}</p>}
        </div>
      ) : (
        <div className="mt-1">
          <p className="text-sm text-ink-dim">
            {result === "draw" ? "Stakes refunded" : result === "win" ? "Pot paid to your wallet" : "Pot paid to opponent"}
          </p>
          {settleTx && chainId && (
            <a
              href={`${EXPLORER[chainId] ?? ""}${settleTx}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-ink"
            >
              View payout <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className="mt-4">
            <Link href="/" className="btn-primary inline-block rounded-xl px-5 py-2.5 text-sm shadow-glow">
              Back to lobby
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
