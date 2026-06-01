"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Swords, Wallet, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Game } from "@/lib/games";
import { cn } from "@/lib/cn";

const FEE = 0.05;

type Mode = "free" | "staked";

export function MatchSetup({
  game,
  onStart,
}: {
  game: Game;
  onStart: () => void;
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [stake, setStake] = useState<number>(game.minStake);
  const [searching, setSearching] = useState(false);
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  const chips = [0.1, 0.5, 1, 2, 5].filter((v) => v >= game.minStake);
  const payout = +(stake * 2 * (1 - FEE)).toFixed(2);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim"
      >
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl glass text-3xl">
          {game.glyph}
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
                Warm up against the Gambit engine. No wallet, no stake, just the
                game. Learn the flow, then put something on the line.
              </p>
            </div>
            <button
              onClick={onStart}
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
            ) : (
              <button
                onClick={() => {
                  setSearching(true);
                  setTimeout(() => setSearching(false), 2600);
                }}
                disabled={searching}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-deep to-teal py-3.5 text-sm font-bold text-void shadow-glow-teal disabled:opacity-70"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Finding an opponent…
                  </>
                ) : (
                  <>
                    <Swords className="h-4 w-4" /> Find match
                  </>
                )}
              </button>
            )}

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
