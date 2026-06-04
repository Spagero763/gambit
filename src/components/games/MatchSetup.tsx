"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Swords, Wallet, Loader2, ShieldCheck, Copy, Check, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { Game } from "@/lib/games";
import { GameCover } from "@/components/art/GameCover";
import { Difficulty, DIFFICULTIES, SUPPORTS_DIFFICULTY } from "@/lib/difficulty";
import { useStakeMatch, useMatchState } from "@/hooks/useStakeMatch";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { cn } from "@/lib/cn";

const FEE = 0.05;

// Map game slug to the contract gameType byte.
const GAME_TYPE: Record<string, number> = {
  chess: 0,
  "tic-tac-toe": 1,
  snakes: 2,
  whot: 3,
  blocks: 4,
};

type Mode = "free" | "staked";

export function MatchSetup({
  game,
  onStart,
}: {
  game: Game;
  onStart: (difficulty: Difficulty) => void;
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [stake, setStake] = useState<number>(game.minStake);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [joinId, setJoinId] = useState("");
  const [copied, setCopied] = useState(false);
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { createMatch, joinMatch, step, error, matchId, ready, onActiveChain } = useStakeMatch();
  const { data: created } = useMatchState(matchId ?? undefined);
  const hasDifficulty = SUPPORTS_DIFFICULTY.has(game.slug);

  const chips = [0.1, 0.5, 1, 2, 5].filter((v) => v >= game.minStake);
  const payout = +(stake * 2 * (1 - FEE)).toFixed(2);

  const busy = step === "approving" || step === "creating" || step === "joining";
  // tuple index 9 = status (2 = Active, both seats filled)
  const opponentJoined = created ? Number((created as readonly unknown[])[9]) === 2 : false;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 py-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim"
      >
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
          <GameCover art={game.art} className="h-full w-full" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">{game.name}</h1>
          <p className="text-sm text-ink-dim">{game.tagline}</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mt-6 grid grid-cols-2 rounded-2xl glass p-1">
        {(
          [
            { id: "free", label: "Free play", icon: Bot },
            { id: "staked", label: "Staked 1v1", icon: Swords },
          ] as const
        ).map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
            >
              {active && (
                <motion.span
                  layoutId="modePill"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn("relative h-4 w-4", active ? "text-ink" : "text-ink-faint")}
              />
              <span className={cn("relative", active ? "text-ink" : "text-ink-faint")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {mode === "free" ? (
          <motion.div
            key="free"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <div className="rounded-3xl glass p-5 shadow-card">
              <p className="text-sm leading-relaxed text-ink-dim">
                Play against the engine. No wallet needed, no stake, just the
                board. See how the game feels, then switch to staked when you
                want to put cUSD on the line.
              </p>
            </div>

            {hasDifficulty && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Difficulty
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id)}
                        className={cn(
                          "rounded-2xl px-3 py-3 text-left transition-all",
                          active ? "glass ring-1 ring-white/25" : "bg-white/[0.03]"
                        )}
                      >
                        <p className={cn("text-sm font-bold", active ? "text-ink" : "text-ink-dim")}>
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-ink-faint">{d.blurb}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => onStart(difficulty)}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3.5 text-sm font-bold text-white shadow-glow"
            >
              Start match
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="staked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Your stake
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((v) => (
                <button
                  key={v}
                  onClick={() => setStake(v)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    stake === v
                      ? "bg-gradient-to-r from-violet-deep to-violet text-white shadow-glow"
                      : "glass text-ink-dim"
                  )}
                >
                  {v.toFixed(2)}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-3xl glass p-5 shadow-card">
              <Row label="Your stake" value={`${stake.toFixed(2)} cUSD`} />
              <Row label="Opponent matches" value={`${stake.toFixed(2)} cUSD`} />
              <Row label="Protocol fee" value="5%" muted />
              <div className="my-3 h-px bg-white/8" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-dim">Winner takes</span>
                <span className="font-display text-xl font-bold text-teal">
                  {payout.toFixed(2)} cUSD
                </span>
              </div>
            </div>

            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3.5 text-sm font-bold text-white shadow-glow"
              >
                <Wallet className="h-4 w-4" /> Connect to stake
              </button>
            ) : !onActiveChain ? (
              <button
                onClick={() => switchChain({ chainId: ACTIVE_CHAIN_ID })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-bold text-void"
              >
                <AlertTriangle className="h-4 w-4" /> Switch network to play
              </button>
            ) : matchId ? (
              // room created: show id to share + opponent status
              <div className="mt-4 rounded-2xl glass p-4 text-center">
                {opponentJoined ? (
                  <>
                    <p className="text-sm font-bold text-teal">Opponent joined</p>
                    <button
                      onClick={() => onStart(difficulty)}
                      className="mt-3 w-full rounded-xl bg-gradient-to-r from-teal-deep to-teal py-3 text-sm font-bold text-void shadow-glow-teal"
                    >
                      Start match
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-faint">Room created. Share this ID with your opponent.</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(matchId.toString());
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="mx-auto mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 font-mono text-lg font-bold text-ink"
                    >
                      #{matchId.toString()}
                      {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4 text-ink-faint" />}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for opponent to join
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => createMatch(stake, GAME_TYPE[game.slug] ?? 0, 2)}
                  disabled={busy || !ready}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-deep to-teal py-3.5 text-sm font-bold text-void shadow-glow-teal disabled:opacity-70"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                  {step === "approving" ? "Approving cUSD…" : step === "creating" ? "Creating room…" : "Create staked room"}
                </button>

                <div className="flex items-center gap-2">
                  <input
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ""))}
                    placeholder="Join by room ID"
                    inputMode="numeric"
                    className="flex-1 rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-white/10 placeholder:text-ink-faint focus:ring-teal/50"
                  />
                  <button
                    onClick={async () => {
                      if (!joinId) return;
                      const ok = await joinMatch(BigInt(joinId), stake);
                      if (ok) onStart(difficulty);
                    }}
                    disabled={busy || !joinId}
                    className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
                  >
                    {step === "joining" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-2 text-center text-[11px] text-rose">{error}</p>}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-faint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Stakes are held in escrow and paid out on-chain at match end.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-ink-dim">{label}</span>
      <span className={cn("text-sm font-medium", muted ? "text-ink-faint" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
