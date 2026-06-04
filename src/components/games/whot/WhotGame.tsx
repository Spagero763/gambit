"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Trophy, Users, RotateCcw, Crown } from "lucide-react";
import Link from "next/link";
import { WhotTable, Seat } from "./WhotTable";
import { WhotRules, DEFAULT_RULES } from "@/lib/games/whot";
import { GameCover } from "@/components/art/GameCover";
import { cn } from "@/lib/cn";

const BOT_NAMES = ["Ada", "Tunde", "Chidi", "Zino", "Bola", "Emeka", "Ngozi", "Kola"];

const RULE_ITEMS: { key: keyof WhotRules; label: string; note: string }[] = [
  { key: "holdOn", label: "Hold On (1)", note: "Play again" },
  { key: "pickTwo", label: "Pick Two (2)", note: "Next draws 2" },
  { key: "pickThree", label: "Pick Three (5)", note: "Next draws 3" },
  { key: "suspension", label: "Suspension (8)", note: "Skip next" },
  { key: "generalMarket", label: "General Market (14)", note: "All draw 1" },
];

type Mode = "free" | "tournament";
type Phase =
  | { kind: "setup" }
  | { kind: "play"; mode: Mode; seats: Seat[]; round: number; match: number; rules: WhotRules }
  | { kind: "result"; champion: string; youWon: boolean; mode: Mode };

const TOURNEY_ROUNDS = ["Semi-final", "Final"];

function bots(count: number, offset = 0): Seat[] {
  return Array.from({ length: count }, (_, i) => ({ name: BOT_NAMES[(i + offset) % BOT_NAMES.length], isBot: true }));
}

export function WhotGame() {
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [mode, setMode] = useState<Mode>("free");
  const [count, setCount] = useState(4);
  const [rules, setRules] = useState<WhotRules>(DEFAULT_RULES);

  const startFree = () => {
    const seats: Seat[] = [{ name: "You", isBot: false }, ...bots(count - 1)];
    setPhase({ kind: "play", mode: "free", seats, round: 0, match: 0, rules });
  };

  const startTournament = () => {
    const seats: Seat[] = [{ name: "You", isBot: false }, ...bots(3)];
    setPhase({ kind: "play", mode: "tournament", seats, round: 0, match: 0, rules });
  };

  const handleEnd = (winnerName: string, youWon: boolean) => {
    if (phase.kind !== "play") return;
    if (phase.mode === "free") {
      setPhase({ kind: "result", champion: winnerName, youWon, mode: "free" });
      return;
    }
    // tournament
    if (!youWon) {
      setPhase({ kind: "result", champion: winnerName, youWon: false, mode: "tournament" });
      return;
    }
    if (phase.round + 1 >= TOURNEY_ROUNDS.length) {
      setPhase({ kind: "result", champion: "You", youWon: true, mode: "tournament" });
      return;
    }
    // advance to next round
    const seats: Seat[] = [{ name: "You", isBot: false }, ...bots(3, phase.round + 1)];
    setPhase({ kind: "play", mode: "tournament", seats, round: phase.round + 1, match: phase.match + 1, rules: phase.rules });
  };

  if (phase.kind === "play") {
    const title =
      phase.mode === "tournament"
        ? `Tournament · ${TOURNEY_ROUNDS[phase.round]}`
        : `Free play · ${phase.seats.length} players`;
    return <WhotTable key={phase.match} seats={phase.seats} title={title} rules={phase.rules} onEnd={handleEnd} />;
  }

  if (phase.kind === "result") {
    return (
      <Celebration
        champion={phase.champion}
        youWon={phase.youWon}
        mode={phase.mode}
        onAgain={() => setPhase({ kind: "setup" })}
      />
    );
  }

  // setup
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-5">
      <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
          <GameCover art="whot" className="h-full w-full" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Naija Whot</h1>
          <p className="text-sm text-ink-dim">Call your shape. Shed your hand.</p>
        </div>
      </div>

      {/* mode */}
      <div className="mt-6 grid grid-cols-2 rounded-2xl glass p-1">
        {([
          { id: "free", label: "Free play", icon: Bot },
          { id: "tournament", label: "Tournament", icon: Trophy },
        ] as const).map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} className="relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold">
              {active && <motion.span layoutId="whotMode" className="absolute inset-0 rounded-xl bg-white/10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <Icon className={cn("relative h-4 w-4", active ? "text-ink" : "text-ink-faint")} />
              <span className={cn("relative", active ? "text-ink" : "text-ink-faint")}>{m.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {mode === "free" ? (
          <motion.div key="free" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Players (you + bots)</p>
            <div className="grid grid-cols-3 gap-2">
              {[2, 4, 6].map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={cn("flex flex-col items-center gap-1 rounded-2xl py-4 transition-all", count === c ? "glass ring-1 ring-white/25" : "bg-white/[0.03]")}
                >
                  <Users className={cn("h-5 w-5", count === c ? "text-ink" : "text-ink-faint")} />
                  <span className={cn("text-sm font-bold", count === c ? "text-ink" : "text-ink-dim")}>{c}</span>
                </button>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-faint">House rules</p>
            <div className="space-y-2">
              {RULE_ITEMS.map((r) => {
                const on = rules[r.key];
                return (
                  <button
                    key={r.key}
                    onClick={() => setRules((prev) => ({ ...prev, [r.key]: !prev[r.key] }))}
                    className="flex w-full items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-2.5 text-left"
                  >
                    <span>
                      <span className="text-sm font-semibold text-ink">{r.label}</span>
                      <span className="ml-2 text-[11px] text-ink-faint">{r.note}</span>
                    </span>
                    <span className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-teal" : "bg-white/15")}>
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[1.125rem]" : "left-0.5")} />
                    </span>
                  </button>
                );
              })}
            </div>

            <button onClick={startFree} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3.5 text-sm font-bold text-white shadow-glow">
              Start table
            </button>
          </motion.div>
        ) : (
          <motion.div key="tournament" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6">
            <div className="rounded-3xl glass p-5 shadow-card">
              <p className="text-sm leading-relaxed text-ink-dim">
                Four players per table. Win your <span className="text-ink">Semi-final</span> to reach the
                {" "}<span className="text-ink">Final</span>. Win the final to be crowned champion.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
                <span className="rounded-full bg-white/5 px-3 py-1">Semi-final</span>
                <span>→</span>
                <span className="rounded-full bg-white/5 px-3 py-1">Final</span>
                <span>→</span>
                <span className="rounded-full bg-amber/15 px-3 py-1 text-amber">Champion</span>
              </div>
            </div>
            <button onClick={startTournament} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber to-[#d9892f] py-3.5 text-sm font-bold text-void shadow-glow">
              Enter tournament
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Celebration({
  champion,
  youWon,
  mode,
  onAgain,
}: {
  champion: string;
  youWon: boolean;
  mode: Mode;
  onAgain: () => void;
}) {
  const confetti = Array.from({ length: 36 });
  const colors = ["#8b7dff", "#27e1a6", "#ffc15e", "#ff6b9a", "#a89bff"];

  return (
    <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center overflow-hidden px-6">
      {youWon &&
        confetti.map((_, i) => {
          const x = Math.random() * 100;
          const delay = Math.random() * 0.6;
          const dur = 2.2 + Math.random() * 1.6;
          const color = colors[i % colors.length];
          return (
            <motion.span
              key={i}
              className="absolute top-0 h-2.5 w-2 rounded-[1px]"
              style={{ left: `${x}%`, background: color }}
              initial={{ y: -20, opacity: 0, rotate: 0 }}
              animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
            />
          );
        })}

      <motion.div initial={{ scale: 0.8, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="relative z-10 w-full rounded-3xl glass p-8 text-center shadow-card">
        <motion.div
          initial={{ rotate: -12, scale: 0.7 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber to-[#c9802b] shadow-glow"
        >
          {youWon ? <Crown className="h-10 w-10 text-void" /> : <Trophy className="h-10 w-10 text-void" />}
        </motion.div>

        <p className="mt-5 font-display text-3xl font-black tracking-tight">
          {youWon ? (mode === "tournament" ? "Champion!" : "You win!") : `${champion} wins`}
        </p>
        <p className="mt-1 text-sm text-ink-dim">
          {youWon
            ? mode === "tournament"
              ? "You took the whole bracket."
              : "You shed your hand first."
            : mode === "tournament"
            ? "Knocked out this round. Run it back."
            : "Close one. Deal again."}
        </p>

        <div className="mt-6 flex gap-2.5">
          <button onClick={onAgain} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3 text-sm font-bold text-white shadow-glow">
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
          <Link href="/" className="flex items-center justify-center rounded-2xl glass px-4 py-3 text-sm font-semibold text-ink-dim">
            Lobby
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
