"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { ease, winEase } from "@/lib/motion";
import { cn } from "@/lib/cn";

const FEE = 0.05;

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

/**
 * End-of-match result + on-chain payout state. While the pot is still settling
 * we do NOT offer "Back to lobby", the winner's money must land first. We show
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
  stakeWei?: string | null; // per-player stake (wei), to show the credited amount
  decimals?: number;
  token?: string | null;
}) {
  const settling = status === "settling";
  const symbol = symbolForToken(token);
  // amount credited to THIS player's wallet: a win takes both stakes minus fee;
  // a draw refunds your own stake. (1v1 only, this overlay is per-match.)
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
      <motion.p
        initial={{ scale: result === "win" ? 0.6 : 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: result === "win" ? winEase : ease }}
        className={cn("display text-[38px] font-extrabold leading-none", result === "draw" ? "text-amber" : result === "win" ? "text-glow" : "text-ink")}
      >
        {result === "draw" ? "Draw" : result === "win" ? "You won" : "You lost"}
      </motion.p>

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
            className="btn-glass mt-3 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] disabled:opacity-60"
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
            <>
              {payout ? (
                <div className="relative mt-4 grid place-items-center">
                  <span aria-hidden className="absolute h-24 w-24 rounded-full border-2 border-teal/50 opacity-0" style={{ animation: "ring 1s 150ms cubic-bezier(0.22,1,0.36,1) forwards" }} />
                  <p className="relative">
                    <AnimatedNumber
                      value={payout}
                      from={0}
                      decimals={2}
                      durationMs={1100}
                      prefix="+"
                      className={cn("display text-[46px] font-extrabold leading-none", result === "win" ? "text-glow" : "text-ink")}
                    />
                    <span className="ml-1.5 text-[18px] font-bold text-ink-dim">{symbol}</span>
                  </p>
                </div>
              ) : null}
              <div className="mx-auto mt-3 flex max-w-[19rem] items-center justify-center gap-2 rounded-full border border-teal/35 bg-teal/[0.1] px-4 py-2 shadow-[0_0_28px_-10px_rgba(62,224,155,0.7)]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                <p className="text-[14px] font-semibold text-teal">{result === "draw" ? "Stake refunded to your wallet" : "Paid to your wallet"}</p>
              </div>
            </>
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
                className="btn-glass inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-[15px]"
              >
                <Share2 className="h-4 w-4" /> Share
              </ShareButton>
            )}
            <Link href="/" className="btn-primary pressable inline-flex h-12 items-center rounded-full px-6 text-[15px]">
              Back to games
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
