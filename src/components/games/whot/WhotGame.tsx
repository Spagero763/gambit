"use client";

import { useContext, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Trophy, Users, RotateCcw, Crown } from "lucide-react";
import Link from "next/link";
import { WhotTable, Seat } from "./WhotTable";
import { WhotRules, DEFAULT_RULES } from "@/lib/games/whot";
import { BOTS } from "@/lib/bots";
import { recordResult } from "@/lib/progress";
import { MoneyNudge } from "../ResultOverlay";
import { Confetti } from "@/components/ui/Confetti";
import { buttonClass } from "@/components/ui/Button";
import { winEase } from "@/lib/motion";
import { cn } from "@/lib/cn";

// Names line up with the bot roster so each opponent shows its matching face.
const BOT_NAMES = BOTS.map((b) => b.name);

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
  // 1v1 first: a practice table should feel like the money match it leads to
  const [count, setCount] = useState(2);
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
    recordResult("whot", youWon ? "win" : "lose");
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
        ? `Whot · ${TOURNEY_ROUNDS[phase.round]}`
        : phase.seats.length === 2
        ? "Naija Whot"
        : `Whot · ${phase.seats.length} players`;
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 pb-2 pt-[calc(12px+env(safe-area-inset-top))]">
        <Link href="/" data-nav="back" aria-label="Back to games" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="display truncate text-[24px] font-extrabold leading-tight text-ink">Naija Whot</h1>
          <p className="text-[13px] text-ink-dim">Practice against the computer</p>
        </div>
      </div>

      {/* mode */}
      <div className="glass mt-4 grid grid-cols-2 gap-1 rounded-full p-1">
        {([
          { id: "free", label: "Table", icon: Bot },
          { id: "tournament", label: "Bot tournament", icon: Trophy },
        ] as const).map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} className="relative flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold">
              {active && (
                <motion.span
                  layoutId="whotMode"
                  className="absolute inset-0 rounded-full border border-teal/30"
                  style={{ background: "linear-gradient(180deg, rgba(62,224,155,0.22), rgba(62,224,155,0.07))" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4", active ? "text-teal" : "text-ink-faint")} />
              <span className={cn("relative", active ? "text-ink" : "text-ink-faint")}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {mode === "free" ? (
        <div key="free" className="enter mt-5">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-dim">Players at the table</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[2, 4, 6].map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  "pressable flex flex-col items-center gap-1 rounded-[20px] py-4",
                  count === c ? "border border-teal/50 bg-teal/[0.1] shadow-[0_0_24px_-8px_rgba(62,224,155,0.6)]" : "glass"
                )}
              >
                <Users className={cn("h-5 w-5", count === c ? "text-teal" : "text-ink-faint")} />
                <span className={cn("display text-[20px] font-bold", count === c ? "text-ink" : "text-ink-dim")}>{c}</span>
                <span className="text-[11px] text-ink-faint">{c === 2 ? "1 on 1" : `you + ${c - 1}`}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-dim">House rules</p>
          <div className="glass divide-y divide-white/[0.06] overflow-hidden rounded-[20px]">
            {RULE_ITEMS.map((r) => {
              const on = rules[r.key];
              return (
                <button
                  key={r.key}
                  onClick={() => setRules((prev) => ({ ...prev, [r.key]: !prev[r.key] }))}
                  role="switch"
                  aria-checked={on}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{r.label}</span>
                    <span className="block text-[12px] text-ink-faint">{r.note}</span>
                  </span>
                  <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-teal shadow-[0_0_14px_rgba(62,224,155,0.5)]" : "bg-white/10")}>
                    <span className={cn("absolute top-1 h-5 w-5 rounded-full transition-transform duration-200 ease-out", on ? "translate-x-6 bg-white" : "translate-x-1 bg-ink-faint")} />
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={startFree} className={buttonClass("primary", "lg", "mt-5 w-full")}>
            Deal the cards
          </button>
        </div>
      ) : (
        <div key="tournament" className="enter mt-5">
          <div className="glass rounded-[24px] p-5">
            <p className="text-[14px] leading-relaxed text-ink-dim">
              Four players per table. Win your <span className="text-ink">Semi-final</span> to reach the{" "}
              <span className="text-ink">Final</span>. Win the final to be crowned champion.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-faint">
              <span className="rounded-full bg-white/5 px-3 py-1">Semi-final</span>
              <span>→</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Final</span>
              <span>→</span>
              <span className="rounded-full bg-amber/15 px-3 py-1 text-amber">Champion</span>
            </div>
          </div>
          <button onClick={startTournament} className="pressable mt-5 flex h-[54px] w-full items-center justify-center rounded-full bg-amber text-[16px] font-bold text-void shadow-[0_12px_28px_-12px_rgba(255,181,71,0.7)]">
            Enter the tournament
          </button>
        </div>
      )}
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
  const onMoney = useContext(MoneyNudge);

  return (
    <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center overflow-hidden px-5">
      {youWon && <Confetti />}

      <motion.div
        initial={{ scale: 0.9, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: winEase }}
        className="panel relative z-10 w-full rounded-[28px] p-7 text-center"
        style={{ background: youWon ? "radial-gradient(120% 80% at 50% 0%, rgba(255,214,107,0.18), rgba(0,0,0,0) 60%), linear-gradient(180deg, #182131, #0e141e)" : undefined }}
      >
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-gold to-amber shadow-[0_14px_36px_-12px_rgba(255,181,71,0.75)]">
          {youWon ? <Crown className="h-10 w-10 text-void" /> : <Trophy className="h-10 w-10 text-void" />}
        </div>

        <p className={cn("display mt-5 text-[34px] font-extrabold leading-none", youWon ? "text-glow" : "text-ink")}>
          {youWon ? (mode === "tournament" ? "Champion" : "You won") : `${champion} wins`}
        </p>
        <p className="mt-2 text-[14px] text-ink-dim">
          {youWon
            ? mode === "tournament"
              ? "You took the whole bracket."
              : "You shed your hand first."
            : mode === "tournament"
            ? "Knocked out this round. Run it back."
            : "Close one. Deal again."}
        </p>

        <div className="mt-6 grid gap-2.5">
          {youWon && onMoney && (
            <button onClick={onMoney} className={buttonClass("primary", "lg", "w-full")}>
              Play someone for money
            </button>
          )}
          <button onClick={onAgain} className={buttonClass(youWon && onMoney ? "secondary" : "primary", "lg", "w-full")}>
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
          <Link href="/" className="mx-auto mt-1 text-[14px] font-semibold text-ink-faint">
            Back to games
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
