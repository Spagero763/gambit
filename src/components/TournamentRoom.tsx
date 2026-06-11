"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  roundSeed,
  stageName,
  TournamentView,
} from "@/lib/tournamentClient";
import { TournamentPodium } from "@/components/TournamentPodium";
import { AnimatePresence } from "framer-motion";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/cn";

// mirrors the contract's joinWindow (600s): a cup must fill within 10 minutes
const JOIN_WINDOW_MS = 10 * 60 * 1000;

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
  // join-window countdown: a cup must fill within 10 minutes or it's
  // auto-cancelled (everyone refunded) — keep players aware and the row honest
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const expirySynced = useRef(false);

  // podium celebration — shown once per tournament when it settles
  const [podium, setPodium] = useState(false);
  useEffect(() => {
    const t = view?.tournament;
    if (!t || t.status !== "settled" || !t.winners?.length) return;
    const key = `gambit:podium:${t.id}`;
    try {
      if (!localStorage.getItem(key)) setPodium(true);
    } catch {
      /* private mode */
    }
  }, [view?.tournament?.status, view?.tournament]);

  const refresh = useCallback(async () => {
    try {
      setView(await fetchTournament(tid));
    } catch {
      setNotFound(true);
    }
  }, [tid]);

  // when the join window lapses on an unfilled cup, trigger the on-chain
  // refund for everyone (one shot) — the server/contract enforce correctness
  useEffect(() => {
    const t = view?.tournament;
    if (!t || t.status !== "open" || expirySynced.current) return;
    const deadline = new Date(t.created_at).getTime() + JOIN_WINDOW_MS;
    if (Date.now() > deadline + 5000) {
      expirySynced.current = true;
      syncTournamentCancelled(tid).then(refresh).catch(() => {});
    }
  }, [now, view?.tournament, tid, refresh]);
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
  const full = players.length >= t.capacity;
  const winners = t.winners ?? [];
  const explorer = EXPLORER[Number(t.chain_id)];

  // knockout state: who is still in, what stage we're at, my round score
  const round = t.round ?? 1;
  const alive = players.filter((p) => p.eliminated_round === null || p.eliminated_round === undefined);
  const stage = stageName(alive.length);
  const isFinal = alive.length <= 3;
  const meRow = players.find((p) => p.address.toLowerCase() === me);
  const iAmAlive = !!meRow && (meRow.eliminated_round === null || meRow.eliminated_round === undefined);
  const myScore = meRow?.round_score ?? null;
  const standings = [
    ...alive.sort((a, b) => (b.round_score ?? -1) - (a.round_score ?? -1)),
    ...players
      .filter((p) => p.eliminated_round !== null && p.eliminated_round !== undefined)
      .sort((a, b) => (b.eliminated_round ?? 0) - (a.eliminated_round ?? 0)),
  ];

  // Each round deals a different board; everyone alive grinds the same one.
  if (playing && t.status === "active" && joined && iAmAlive && me) {
    return (
      <BlockBlitz
        seed={roundSeed(t.seed, round)}
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
      setMsg(friendlyError(e, "Join failed — please try again."));
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await settleTournamentNow(tid);
      if (!res.ok && res.error) setMsg(friendlyError(res.error, "Couldn't close the round — try again."));
      else if (!res.ok && res.retryInMs) setMsg(`Not everyone has finished — you can force payout in ${Math.ceil(res.retryInMs / 60000)} min.`);
      await refresh();
    } catch (e: any) {
      setMsg(friendlyError(e, "Couldn't close the round — try again."));
    } finally {
      setBusy(false);
    }
  };

  // Creator cancels an un-started cup -> escrow refunds everyone who joined.
  // ALWAYS re-sync afterwards: if the on-chain cancel already happened (e.g. a
  // double-tap), the sync still flips the room to "cancelled" instead of
  // leaving a raw revert on screen.
  const cancelCup = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await cancelMatch(tid).catch(() => false);
      const res = await syncTournamentCancelled(tid).catch(() => ({ ok: false, error: undefined as string | undefined }));
      if (!res.ok) setMsg(friendlyError(res.error, "Couldn't cancel yet — try again in a moment."));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Permissionless backstop: refund everyone from a cup that can't finish.
  // Tries the on-chain reclaim (filled-but-stalled pots), then falls back to
  // the server-side cancel (relayer rescues a cup that never filled on-chain).
  const reclaim = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await reclaimStalled(tid).catch(() => false);
      const res = await syncTournamentCancelled(tid).catch(() => ({ ok: false, error: undefined as string | undefined }));
      if (!ok && !res.ok) {
        setMsg(friendlyError(res.error, "Not refundable yet — the contract windows haven't lapsed."));
      }
      await refresh();
    } catch (e: any) {
      setMsg(friendlyError(e, "Refund failed — try again shortly."));
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
          {t.status === "active" ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", isFinal ? "bg-amber/20 text-amber" : "bg-violet/15 text-violet-bright")}>
                {stage}
              </span>
              <span className="text-ink-faint text-[12px]">
                Round {round} · {alive.length} still in{isFinal ? " · winners take the pot" : ` · top ${Math.max(3, Math.ceil(alive.length / 2))} advance`}
              </span>
            </p>
          ) : (
            <p className="text-sm text-ink-dim">Knockout rounds · final three split the pot</p>
          )}
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
            {winners.length >= 3 && (
              <button onClick={() => setPodium(true)} className="mx-auto mt-3 block rounded-xl border border-line bg-void-800 px-4 py-2 text-[12px] font-medium text-ink-dim transition-colors hover:text-ink">
                Replay the celebration 🎉
              </button>
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
            {(() => {
              const left = new Date(t.created_at).getTime() + JOIN_WINDOW_MS - now;
              if (left <= 0)
                return <p className="mt-2 text-[12px] font-semibold text-rose">Join window closed — refunding everyone…</p>;
              const m = Math.floor(left / 60000);
              const s = Math.floor((left % 60000) / 1000);
              return (
                <p className={cn("nums mt-2 text-[12px] font-semibold", left < 120000 ? "text-rose" : "text-amber")}>
                  ⏱ Join window closes in {m}:{s.toString().padStart(2, "0")} — everyone must stake before then
                </p>
              );
            })()}
            <button onClick={cancelCup} disabled={busy} className="mx-auto mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-line bg-void-800 px-4 py-2 text-[12px] font-medium text-ink-dim transition-colors hover:text-rose disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {isCreator ? "Cancel & refund everyone" : "Refund everyone (after join window)"}
            </button>
          </div>
        ) : !iAmAlive ? (
          // joined but knocked out in an earlier round
          <div className="text-center">
            <p className="font-semibold text-ink">Knocked out</p>
            <p className="mt-1 text-sm text-ink-dim">
              You fell in round {meRow?.eliminated_round}. Stick around — the {stage.toLowerCase()} is live below.
            </p>
          </div>
        ) : (
          // active + alive
          <div className="space-y-3">
            <button onClick={() => setPlaying(true)} className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm shadow-glow">
              <Play className="h-4 w-4" /> {myScore === null ? `Play your ${stage} run` : "Improve your run"}
            </button>
            {myScore !== null && <p className="text-center text-[12px] text-ink-faint">Your best this round: <span className="nums font-semibold text-ink">{myScore.toLocaleString()}</span></p>}
            <button onClick={settle} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-void-800 py-2.5 text-[12px] text-ink-dim transition-colors hover:text-ink disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {isFinal ? "Finish final & pay out" : "Close this round"}
            </button>
            <button onClick={reclaim} disabled={busy} className="mx-auto block text-[11px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-60">
              Payout stuck? Reclaim all stakes (refund everyone, after 1h)
            </button>
          </div>
        )}
        {(msg || error) && <p className="mt-2 text-center text-[11px] text-rose">{msg ?? error}</p>}
        {t.settle_error && t.status !== "cancelled" && t.status !== "settled" && (
          <p className="mt-2 text-center text-[11px] text-amber">
            Last payout attempt didn&apos;t go through: {friendlyError(t.settle_error, "the network rejected it")}. Anyone may retry above.
          </p>
        )}
      </div>

      {/* standings */}
      <div className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint"><Users className="h-3.5 w-3.5" /> Standings</p>
        <div className="space-y-2">
          {standings.map((p, i) => {
            const out = p.eliminated_round !== null && p.eliminated_round !== undefined;
            const isWinner = winners.some((w) => w.toLowerCase() === p.address.toLowerCase());
            const rankIdx = winners.findIndex((w) => w.toLowerCase() === p.address.toLowerCase());
            const prize =
              t.status === "settled" && rankIdx >= 0
                ? pot * SPLIT[rankIdx]
                : !out && isFinal && i < 3 && p.round_score !== null
                  ? pot * SPLIT[i]
                  : 0;
            const showMedal = (t.status === "settled" ? rankIdx >= 0 : isFinal && !out && i < 3);
            const medalIdx = t.status === "settled" ? rankIdx : i;
            return (
              <motion.div
                key={p.address}
                layout
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3",
                  isWinner ? "border-amber/40 bg-amber/[0.06]" : "border-line bg-void-800",
                  out && "opacity-55",
                  p.address.toLowerCase() === me ? "ring-1 ring-teal/40" : ""
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm">
                    {showMedal ? MEDAL[medalIdx] : <span className="text-ink-faint">{out ? "—" : i + 1}</span>}
                  </span>
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
                    <p className="text-[11px] text-ink-faint">
                      {out
                        ? `Out in round ${p.eliminated_round}`
                        : p.round_score === null || p.round_score === undefined
                          ? "Not played this round"
                          : `${p.round_score.toLocaleString()} pts`}
                    </p>
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

      {/* podium celebration */}
      <AnimatePresence>
        {podium && winners.length >= 3 && (
          <TournamentPodium
            winners={winners}
            profiles={profiles}
            pot={pot}
            sym={sym}
            settleTx={t.settle_tx}
            explorer={explorer}
            me={me}
            onClose={() => {
              setPodium(false);
              try {
                localStorage.setItem(`gambit:podium:${t.id}`, "1");
              } catch {
                /* private mode */
              }
            }}
          />
        )}
      </AnimatePresence>
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
