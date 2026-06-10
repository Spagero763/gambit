"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Loader2, Wallet, ShieldCheck, AlertTriangle, Play, Copy, Check, ExternalLink, Crown } from "lucide-react";
import Link from "next/link";
import { useAccount, useConnect, useSwitchChain, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { BlockBlitz } from "@/components/games/blocks/BlockBlitz";
import { useStakeMatch } from "@/hooks/useStakeMatch";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { tokensFor, symbolForToken, decimalsForToken } from "@/lib/tokens";
import { hasToken, signIn } from "@/lib/profile";
import { useProfiles, displayName, avatarHex } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import {
  fetchTournament,
  joinTournament,
  submitTournamentScore,
  settleTournamentNow,
  syncTournamentCancelled,
  TournamentView,
} from "@/lib/tournamentClient";
import { cn } from "@/lib/cn";

const FEE = 0.05;
const SPLIT = [0.5, 0.3, 0.2];
const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};
const MEDAL = ["🥇", "🥈", "🥉"];

export function TournamentRoom({ id }: { id: string }) {
  const tid = BigInt(id);
  const [view, setView] = useState<TournamentView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { joinMatch, cancelMatch, reclaimStalled, step, error, ready, onActiveChain } = useStakeMatch();
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(hasToken(address)), [address]);
  // resolve player names/avatars (empty until the view loads — hook stays unconditional)
  const profiles = useProfiles(view?.players.map((p) => p.address) ?? []);

  const refresh = useCallback(async () => {
    try {
      setView(await fetchTournament(tid));
    } catch {
      setNotFound(true);
    }
  }, [tid]);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  if (notFound) {
    // Extremely rare: the on-chain match exists but its DB row never landed.
    // The stake is still safe in escrow — offer the on-chain refund directly so
    // a creator can always recover funds without leaving the app.
    return (
      <div className="mx-auto w-full max-w-md px-5 py-10 text-center">
        <p className="font-semibold text-ink">Tournament not found</p>
        <p className="mt-1 text-sm text-ink-dim">If you just created this cup and it didn&apos;t save, your stake is still safe in escrow. You can refund it on-chain below.</p>
        <button
          onClick={async () => {
            setBusy(true); setMsg(null);
            try { const ok = await cancelMatch(tid); if (ok) setMsg("Refunded. Your stake was returned to your wallet."); }
            catch (e: any) { setMsg(e?.message ?? "Refund failed — you may not be the creator, or the cup already started."); }
            finally { setBusy(false); }
          }}
          disabled={busy || !isConnected}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-void-800 px-4 py-2 text-[12px] font-medium text-ink-dim transition-colors hover:text-rose disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Refund my stake (on-chain)
        </button>
        {msg && <p className="mt-2 text-[11px] text-teal">{msg}</p>}
        <Link href="/tournaments" className="mt-5 inline-flex items-center gap-2 text-teal"><ArrowLeft className="h-4 w-4" /> All tournaments</Link>
      </div>
    );
  }
  if (!view) {
    return <div className="mx-auto w-full max-w-2xl px-5 py-10 text-center text-ink-faint">Loading…</div>;
  }

  const { tournament: t, players } = view;
  const sym = symbolForToken(t.token);
  const dec = t.decimals ?? decimalsForToken(t.token);
  const stake = Number(formatUnits(BigInt(t.stake), dec));
  const pot = stake * t.capacity * (1 - FEE);
  const me = address?.toLowerCase();
  const isCreator = !!me && t.creator.toLowerCase() === me;
  const joined = !!me && players.some((p) => p.address.toLowerCase() === me);
  const myScore = players.find((p) => p.address.toLowerCase() === me)?.score ?? null;
  const full = players.length >= t.capacity;
  const standings = [...players].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const winners = t.winners ?? [];
  const explorer = EXPLORER[Number(t.chain_id)];

  // The shared board comes from the play state; in tournament mode each player
  // grinds the identical seed and the server keeps their best.
  if (playing && t.status === "active" && joined && me) {
    return (
      <BlockBlitz
        seed={t.seed}
        onExit={() => { setPlaying(false); refresh(); }}
        onSubmit={async (score) => {
          try { await submitTournamentScore(tid, me, score); refresh(); } catch {}
        }}
      />
    );
  }

  const stakeTokens = tokensFor(Number(t.chain_id));
  const stakeToken = stakeTokens.find((x) => x.address.toLowerCase() === (t.token ?? "").toLowerCase()) ?? stakeTokens[0];

  const join = async () => {
    if (!me) return;
    setBusy(true);
    setMsg(null);
    try {
      const ok = await joinMatch(tid, stake, stakeToken);
      if (ok) {
        await joinTournament(tid, me);
        await refresh();
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Join failed");
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await settleTournamentNow(tid);
      if (!res.ok && res.error) setMsg(res.error);
      else if (!res.ok && res.retryInMs) setMsg(`Not everyone has finished — you can force payout in ${Math.ceil(res.retryInMs / 60000)} min.`);
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Settle failed");
    } finally {
      setBusy(false);
    }
  };

  // Creator cancels an un-started cup -> escrow refunds everyone who joined.
  const cancelCup = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await cancelMatch(tid);
      if (ok) { await syncTournamentCancelled(tid); await refresh(); }
    } catch (e: any) {
      setMsg(e?.message ?? "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  // Permissionless backstop: if a filled cup never settles, anyone can refund
  // everyone after the on-chain settle window. The contract enforces the timing.
  const reclaim = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await reclaimStalled(tid);
      if (ok) { await syncTournamentCancelled(tid); await refresh(); }
    } catch (e: any) {
      setMsg(e?.message ?? "Reclaim failed — the payout window may not have elapsed yet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-4">
      <Link href="/tournaments" className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
        <ArrowLeft className="h-4 w-4" /> Tournaments
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber/15 text-amber"><Trophy className="h-6 w-6" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold">Block Blitz Cup</h1>
          <p className="text-sm text-ink-dim">Same board for all · top 3 split the pot</p>
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(typeof window !== "undefined" ? window.location.href : ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-void-800 px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />} Invite
        </button>
      </div>

      {/* pot summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Entry" value={`${stake.toFixed(2)}`} sub={sym} />
        <Stat label="Players" value={`${players.length}/${t.capacity}`} />
        <Stat label="Pool" value={`${pot.toFixed(2)}`} sub={sym} teal />
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        Payouts · 1st {(pot * SPLIT[0]).toFixed(2)} · 2nd {(pot * SPLIT[1]).toFixed(2)} · 3rd {(pot * SPLIT[2]).toFixed(2)} {sym}
      </p>

      {/* action zone */}
      <div className="mt-5 rounded-3xl glass p-5 shadow-card">
        {t.status === "cancelled" ? (
          <div className="text-center">
            <p className="font-semibold text-ink">Tournament cancelled</p>
            <p className="text-sm text-ink-dim">Every stake was refunded on-chain. Nothing is owed.</p>
          </div>
        ) : t.status === "settled" ? (
          <div className="text-center">
            <Crown className="mx-auto h-6 w-6 text-amber" />
            <p className="mt-1 font-semibold text-ink">Tournament settled</p>
            <p className="text-sm text-ink-dim">The pot has been paid out on-chain.</p>
            {explorer && t.settle_tx && (
              <a href={`${explorer}${t.settle_tx}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-teal">
                View payout <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ) : !isConnected ? (
          <button onClick={() => connect({ connector: injected() })} className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow">
            <Wallet className="h-4 w-4" /> Connect wallet
          </button>
        ) : !onActiveChain ? (
          <button onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-semibold text-void">
            <AlertTriangle className="h-4 w-4" /> Switch network
          </button>
        ) : !authed ? (
          <button
            onClick={async () => { if (!address) return; try { await signIn(address, (a) => signMessageAsync({ message: a.message })); setAuthed(true); } catch {} }}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow"
          >
            <ShieldCheck className="h-4 w-4" /> Sign in (free, no gas)
          </button>
        ) : !joined ? (
          t.status !== "open" ? (
            <p className="text-center text-sm text-ink-faint">This tournament is already underway.</p>
          ) : full ? (
            <p className="text-center text-sm text-ink-faint">This tournament is full.</p>
          ) : (
            <button onClick={join} disabled={busy || !ready} className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow disabled:opacity-60">
              {busy || step === "approving" || step === "joining" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {step === "approving" ? `Approving ${sym}…` : `Join & stake ${stake.toFixed(2)} ${sym}`}
            </button>
          )
        ) : t.status === "open" ? (
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm text-ink-dim"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for players</p>
            <p className="mt-1 text-[12px] text-ink-faint">Starts automatically when all {t.capacity} seats are filled. Share the invite link.</p>
            <button onClick={cancelCup} disabled={busy} className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-void-800 px-4 py-2 text-[12px] font-medium text-ink-dim transition-colors hover:text-rose disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {isCreator ? "Cancel & refund everyone" : "Refund everyone (after join window)"}
            </button>
          </div>
        ) : (
          // active + joined
          <div className="space-y-3">
            <button onClick={() => setPlaying(true)} className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow">
              <Play className="h-4 w-4" /> {myScore === null ? "Play your run" : "Improve your run"}
            </button>
            {myScore !== null && <p className="text-center text-[12px] text-ink-faint">Your best so far: <span className="nums font-semibold text-ink">{myScore.toLocaleString()}</span></p>}
            <button onClick={settle} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-void-800 py-2.5 text-[12px] text-ink-dim transition-colors hover:text-ink disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Finish & pay out
            </button>
            <button onClick={reclaim} disabled={busy} className="mx-auto block text-[11px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-60">
              Payout stuck? Reclaim all stakes (refund everyone, after 1h)
            </button>
          </div>
        )}
        {(msg || error) && <p className="mt-2 text-center text-[11px] text-rose">{msg ?? error}</p>}
        {t.settle_error && <p className="mt-2 text-center text-[11px] text-amber">Last payout attempt failed: {t.settle_error}. Anyone may retry with “Finish & pay out”.</p>}
      </div>

      {/* standings */}
      <div className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint"><Users className="h-3.5 w-3.5" /> Standings</p>
        <div className="space-y-2">
          {standings.map((p, i) => {
            const isWinner = winners.some((w) => w.toLowerCase() === p.address.toLowerCase());
            const rankIdx = winners.findIndex((w) => w.toLowerCase() === p.address.toLowerCase());
            const prize = t.status === "settled" && rankIdx >= 0 ? pot * SPLIT[rankIdx] : i < 3 && p.score !== null ? pot * SPLIT[i] : 0;
            return (
              <motion.div
                key={p.address}
                layout
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3",
                  isWinner ? "border-amber/40 bg-amber/[0.06]" : "border-line bg-void-800",
                  p.address.toLowerCase() === me ? "ring-1 ring-teal/40" : ""
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm">{i < 3 ? MEDAL[i] : <span className="text-ink-faint">{i + 1}</span>}</span>
                  <Avatar
                    image={profiles[p.address.toLowerCase()]?.avatar_image || undefined}
                    color={avatarHex(profiles[p.address.toLowerCase()])}
                    name={displayName(p.address, profiles[p.address.toLowerCase()])}
                    size={32}
                    rounded="rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {displayName(p.address, profiles[p.address.toLowerCase()])}
                      {p.address.toLowerCase() === me ? <span className="text-teal"> (you)</span> : ""}
                    </p>
                    <p className="text-[11px] text-ink-faint">{p.score === null ? "Not played yet" : `${p.score.toLocaleString()} pts`}</p>
                  </div>
                </div>
                {prize > 0 && <span className="nums text-sm font-bold text-teal">+{prize.toFixed(2)} {sym}</span>}
              </motion.div>
            );
          })}
          {Array.from({ length: Math.max(0, t.capacity - standings.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-[12px] text-ink-faint">
              <span className="w-6 text-center">{standings.length + i + 1}</span> Open seat
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, teal }: { label: string; value: string; sub?: string; teal?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-void-700 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn("nums text-lg font-bold", teal ? "text-teal" : "text-ink")}>{value}{sub ? <span className="ml-1 text-[11px] font-medium text-ink-faint">{sub}</span> : null}</p>
    </div>
  );
}
