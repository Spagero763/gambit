"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Loader2, ShieldCheck, Play, BadgeCheck } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useGoodId } from "@/hooks/useGoodId";
import { hasToken, signIn } from "@/lib/profile";
import { fetchCup, joinCup, submitCupScore, settleLastCup, CupView } from "@/lib/cupClient";
import { BlockBlitz } from "@/components/games/blocks/BlockBlitz";
import { cn } from "@/lib/cn";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const MEDAL = ["🥇", "🥈", "🥉"];

function timeLeft(endsAt: number) {
  const ms = Math.max(0, endsAt - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * The free Weekly Cup — the GoodID-gated tournament. One entry per verified
 * human (enforced server-side against GoodDollar's Identity contract), everyone
 * plays the same Block Blitz board all week, top three split a USDm prize from
 * the treasury. No stake, no gas: just proof you're one real person.
 */
export function WeeklyCup() {
  const { address, isConnected } = useAccount();
  const { login } = usePrivy();
  const { signMessageAsync } = useSignMessage();
  const { verified, verify, ready } = useGoodId();

  const [cup, setCup] = useState<CupView | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCup(await fetchCup(address));
    } catch {
      /* keep the last view */
    }
  }, [address]);

  useEffect(() => {
    settleLastCup(); // pay last week's podium if nobody has yet (idempotent)
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (playing) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh, playing]);

  const enter = async () => {
    if (!address) return;
    setBusy(true);
    setErr(null);
    try {
      if (!hasToken(address)) {
        await signIn(address, (a) => signMessageAsync({ message: a.message }));
      }
      await joinCup(address);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Could not join");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (score: number) => {
    if (!address || score <= 0) return;
    try {
      await submitCupScore(address, score);
      void refresh();
    } catch {
      /* next run can resubmit — best score is kept server-side */
    }
  };

  if (playing && cup) {
    return (
      <div className="mt-4">
        <BlockBlitz seed={cup.seed} onSubmit={submit} onExit={() => setPlaying(false)} />
      </div>
    );
  }

  if (!cup) return null;

  // Coming Soon: the cup is announced but entries haven't opened yet. Show the
  // full pitch (prize, rules) so it builds appetite, with no join button.
  if (!cup.open) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-3xl border border-teal/25 bg-gradient-to-br from-teal/[0.08] to-transparent p-5 shadow-card"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">Weekly Cup</h2>
              <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">
                COMING SOON
              </span>
            </div>
            <p className="text-[12px] text-ink-dim">
              Free entry, verified humans only. Everyone plays the same board all week and the top 3 split{" "}
              <span className="font-semibold text-ink">{cup.prize} USDm</span>, paid from an on chain prize vault.
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-void-800 px-3 py-2 text-center text-[12px] text-ink-faint">
          Entries open very soon. Get verified on your Profile now so you can enter the second it does.
        </p>
      </motion.div>
    );
  }

  const podium = cup.last?.status === "settled" ? cup.last.winners ?? [] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 overflow-hidden rounded-3xl border border-teal/25 bg-gradient-to-br from-teal/[0.08] to-transparent p-5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal">
          <Trophy className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold">Weekly Cup</h2>
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">
              FREE · humans only
            </span>
          </div>
          <p className="text-[12px] text-ink-dim">
            Same board for everyone · top 3 split <span className="font-semibold text-ink">{cup.prize} USDm</span> ·
            ends in {timeLeft(cup.endsAt)}
          </p>
        </div>
      </div>

      {/* leaderboard */}
      {cup.entries.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {cup.entries.slice(0, 5).map((e, i) => (
            <div
              key={e.address}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px]",
                e.address === address?.toLowerCase() ? "bg-teal/10 text-ink" : "text-ink-dim"
              )}
            >
              <span className="w-6 text-center">{MEDAL[i] ?? `${i + 1}.`}</span>
              <span className="font-mono text-xs">{short(e.address)}</span>
              {e.address === address?.toLowerCase() && (
                <span className="rounded-full bg-teal/15 px-1.5 text-[10px] font-semibold text-teal">you</span>
              )}
              <span className="ml-auto font-semibold tabular-nums">{e.score.toLocaleString()}</span>
            </div>
          ))}
          {cup.count > 5 && <p className="px-3 text-[11px] text-ink-faint">{cup.count} humans entered</p>}
        </div>
      )}

      {/* actions */}
      <div className="mt-4">
        {!isConnected ? (
          <button onClick={() => login()} className="btn-primary w-full rounded-xl py-3 text-sm shadow-glow">
            Sign in to enter free
          </button>
        ) : cup.joined ? (
          <button
            onClick={() => setPlaying(true)}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
          >
            <Play className="h-4 w-4" />
            {cup.me && cup.me.score > 0 ? `Play again — your best: ${cup.me.score.toLocaleString()}` : "Play the weekly board"}
          </button>
        ) : ready && verified === false ? (
          <button
            onClick={() => verify()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-void-700 py-3 text-sm text-ink transition-colors hover:border-teal/40"
          >
            <ShieldCheck className="h-4 w-4 text-teal" />
            Verify you&apos;re human to enter (free, ~1 min)
          </button>
        ) : (
          <button
            onClick={enter}
            disabled={busy}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
            Enter this week&apos;s cup — free
          </button>
        )}
        {err && <p className="mt-2 text-center text-[12px] text-rose">{err}</p>}
      </div>

      {/* last week's podium */}
      {podium.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Last week&apos;s podium</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {podium.map((w, i) => (
              <span key={w.address} className="text-[12px] text-ink-dim">
                {MEDAL[i]} <span className="font-mono">{short(w.address)}</span>{" "}
                <span className="text-teal">+{w.amount} USDm</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
