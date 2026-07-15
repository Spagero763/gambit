"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Loader2, ShieldCheck, Check, Clock } from "lucide-react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useGoodDollarClaim } from "@/hooks/useGoodDollarClaim";
import { useGoodId } from "@/hooks/useGoodId";
import { play } from "@/lib/sfx";

/** "5h 23m" style countdown to the next claim. */
function useCountdown(target: Date | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => tick((n) => n + 1), 1000 * 30);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m}m`;
  return "under a minute";
}

/**
 * The always-there GoodDollar claim card. Unlike the once-a-day popup, this
 * lives on the home screen so anyone can claim (or see their countdown) at any
 * time. GoodDollar funds the money AND the gas, so it is the free-to-play bridge:
 * claim here, then stake the G$ you just got.
 */
export function GoodDollarCard() {
  const { address } = useAccount();
  const { login } = usePrivy();
  const { state, amount, nextAt, claim, claiming, error, refresh } = useGoodDollarClaim();
  const { verify } = useGoodId();
  const [verifying, setVerifying] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const countdown = useCountdown(nextAt);

  // hide entirely when there is nothing meaningful to show
  if (state === "unavailable") return null;

  const doClaim = async () => {
    await claim();
    play("win");
    setJustClaimed(true);
    void refresh();
  };

  const claimed = state === "claimed" || justClaimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-3 w-full max-w-2xl overflow-hidden rounded-2xl border border-teal/30 p-4"
      style={{ background: "linear-gradient(120deg, rgba(62,207,142,0.12), rgba(62,207,142,0.03) 70%)" }}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
          <Coins className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Daily GoodDollar</p>
          <p className="text-[12px] text-ink-dim">
            {!address
              ? "Sign in to claim free money every day"
              : state === "loading"
                ? "Checking your daily claim…"
                : state === "needs_verify"
                  ? "Free money every day, once you verify you are human"
                  : claimed
                    ? countdown === "now"
                      ? "Your next claim is ready"
                      : `Claimed. Next claim in ${countdown ?? "a few hours"}`
                    : amount > 0
                      ? "Free from GoodDollar, and your gas is covered"
                      : "Your daily claim is ready"}
          </p>
        </div>

        {/* right-side action / status */}
        {!address ? (
          <button onClick={() => login()} className="rounded-xl bg-teal px-3.5 py-2 text-[12px] font-bold text-void">
            Sign in
          </button>
        ) : state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
        ) : state === "needs_verify" ? (
          <button
            onClick={async () => {
              setVerifying(true);
              try {
                await verify();
              } finally {
                setVerifying(false);
              }
            }}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal/40 bg-void-700 px-3 py-2 text-[12px] font-semibold text-teal disabled:opacity-60"
          >
            {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Verify
          </button>
        ) : claimed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-void-700 px-3 py-1.5 text-[11px] font-semibold text-ink-dim">
            <Clock className="h-3.5 w-3.5" /> {countdown ?? "soon"}
          </span>
        ) : (
          <button
            onClick={doClaim}
            disabled={claiming}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2 text-[13px] font-bold text-void shadow-glow disabled:opacity-60"
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            {claiming ? "Claiming…" : amount > 0 ? `Claim ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} G$` : "Claim"}
          </button>
        )}
      </div>

      {justClaimed && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-teal">
          <Check className="h-3.5 w-3.5" /> Claimed. It is in your wallet, and your gas is covered. Go play a match with it.
        </p>
      )}
      {error && <p className="mt-2 text-[12px] text-rose">{error}</p>}
    </motion.div>
  );
}
