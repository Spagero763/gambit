"use client";

import { useState } from "react";
import { Loader2, ExternalLink, RotateCcw, Share2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatUnits } from "viem";
import { retrySettle } from "@/lib/matchClient";
import { useStakeMatch } from "@/hooks/useStakeMatch";
import { Confetti } from "@/components/motion/Confetti";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { friendlyError } from "@/lib/errors";
import { symbolForToken } from "@/lib/tokens";
import { inviteUrl } from "@/lib/share";
import { ShareButton } from "@/components/ShareButton";
import { ExternalA } from "@/components/ExternalA";
import { cn } from "@/lib/cn";

const FEE = 0.05;

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
  shareAddress,
  stakeWei,
  decimals,
  token,
}: {
  result: "win" | "lose" | "draw";
  status: string; // "settling" | "settled"
  settleTx?: string | null;
  settleError?: string | null;
  chainId?: number;
  matchId: bigint;
  shareAddress?: string;
  stakeWei?: string | null; // per-player stake (wei) — to show the credited amount
  decimals?: number;
  token?: string | null;
}) {
  const settling = status === "settling";
  const symbol = symbolForToken(token);
  // amount credited to THIS player's wallet: a win takes both stakes minus fee;
  // a draw refunds your own stake. (1v1 only — this overlay is per-match.)
  const stake = stakeWei ? Number(formatUnits(BigInt(stakeWei), decimals ?? 18)) : null;
  const payout = stake === null ? null : result === "win" ? stake * 2 * (1 - FEE) : result === "draw" ? stake : null;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { reclaimStalled, error: reclaimError } = useStakeMatch();
  const [reclaiming, setReclaiming] = useState(false);

  const retry = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await retrySettle(matchId);
      if (!r.settled) setMsg(r.error ?? "Still not settled. Try again in a moment.");
      // on success the realtime subscription flips status to "settled"
    } catch (e: any) {
      setMsg(e?.message ?? "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center">
      {result === "win" && !settling && <Confetti className="fixed z-10" />}
      <p className={cn("text-3xl font-black tracking-tight", result === "draw" ? "text-amber" : result === "win" ? "text-teal" : "text-rose")}>
        {result === "draw" ? "Draw" : result === "win" ? "You win" : "You lose"}
      </p>

      {settling ? (
        <div className="mt-2">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {result === "draw" ? "Refunding…" : "Paying out…"}
          </p>
          {(settleError || msg) && (
            <p className="mx-auto mt-2 max-w-[16rem] text-[11px] leading-snug text-rose">
              {friendlyError(msg || settleError, "The payout hit a snag. Tap retry.")}
            </p>
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
          {result === "lose" ? (
            <p className="text-sm text-ink-dim">Pot paid to opponent</p>
          ) : (
            <div className="mx-auto mt-1 flex max-w-[18rem] items-center justify-center gap-2 rounded-2xl border border-teal/30 bg-teal/[0.08] px-4 py-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" />
              <p className="text-left text-sm font-semibold text-teal">
                {result === "draw" ? "Stake refunded to your wallet" : "Paid to your wallet"}
                {payout ? (
                  <>
                    {" · "}
                    <AnimatedNumber value={payout} decimals={2} suffix={` ${symbol}`} />
                  </>
                ) : null}
              </p>
            </div>
          )}
          {settleTx && chainId && (
            <ExternalA
              href={`${EXPLORER[chainId] ?? ""}${settleTx}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-ink"
            >
              {result === "lose" ? "View result" : "View payout on Celoscan"} <ExternalLink className="h-3 w-3" />
            </ExternalA>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            {result === "win" && (
              <ShareButton
                text="Just won a staked match on Gambit and got paid on the spot. Who is next?"
                url={inviteUrl(shareAddress)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-void-600 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
              >
                <Share2 className="h-4 w-4" /> Share
              </ShareButton>
            )}
            <Link href="/" className="btn-primary inline-block rounded-xl px-5 py-2.5 text-sm shadow-glow">
              Back to lobby
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
