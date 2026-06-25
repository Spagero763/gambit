"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Zap, Check, Gift, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useProgress, levelInfo, claimQuest } from "@/lib/progress";
import { Confetti } from "@/components/motion/Confetti";
import { Portal } from "@/components/Portal";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

/** Full progression card: level + XP, streak, and today's quests. */
export function ProgressCard() {
  const p = useProgress();
  const lvl = levelInfo(p.xp);
  const claimable = p.quests.some((q) => q.progress >= q.goal && !q.claimed);
  // Claiming pops a centered reward so it's tappable instantly, wherever the
  // quest sits on the page — no scrolling to the inline row.
  const [reveal, setReveal] = useState<{ xp: number; label: string } | null>(null);

  return (
    <>
    <div className="rounded-2xl border border-line bg-void-700 p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-void-600 text-base font-bold text-teal ring-1 ring-line">
          {lvl.level}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Level {lvl.level}</p>
            <p className="nums text-[11px] text-ink-faint">
              {lvl.into}/{lvl.span} XP
            </p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-void-600">
            <motion.div
              className="h-full rounded-full bg-teal"
              initial={{ width: 0 }}
              animate={{ width: `${lvl.pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-line bg-void-800 px-3 py-1.5">
          <span className="flex items-center gap-1 text-amber">
            <Flame className="h-4 w-4" />
            <span className="nums text-base font-bold">{p.streak}</span>
          </span>
          <span className="text-[9px] text-ink-faint">day streak</span>
        </div>
      </div>

      <div className="mt-4 mb-2 flex items-center gap-2">
        <Gift className="h-3.5 w-3.5 text-ink-dim" />
        <p className="text-xs font-semibold text-ink-dim">Daily quests</p>
        {claimable && <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-teal" />}
      </div>

      <ul className="space-y-2">
        {p.quests.map((q) => {
          const done = q.progress >= q.goal;
          const pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
          return (
            <li key={q.id} className="rounded-xl border border-line bg-void-800 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("truncate text-[13px] font-medium", q.claimed ? "text-ink-faint line-through" : "text-ink")}>
                    {q.label}
                  </p>
                  <p className="nums mt-0.5 text-[10px] text-ink-faint">
                    {Math.min(q.progress, q.goal)}/{q.goal} · +{q.xp} XP
                  </p>
                </div>
                {q.claimed ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-teal">
                    <Check className="h-3.5 w-3.5" /> Done
                  </span>
                ) : done ? (
                  <button
                    onClick={() => {
                      claimQuest(q.id);
                      play("win");
                      setReveal({ xp: q.xp, label: q.label });
                    }}
                    className="btn-primary rounded-lg px-3 py-1.5 text-[12px]"
                  >
                    Claim
                  </button>
                ) : (
                  <span className="nums text-[11px] text-ink-faint">{pct}%</span>
                )}
              </div>
              {!q.claimed && !done && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-void-600">
                  <div className="h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>

    {/* claim reveal — portaled to <body> so it centers on the viewport */}
    <Portal>
    <AnimatePresence>
      {reveal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-void/85 px-6 backdrop-blur-md"
          onClick={() => setReveal(null)}
        >
          <Confetti count={42} />
          <motion.div
            initial={{ scale: 0.7, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[min(88%,22rem)] rounded-3xl border border-teal/40 bg-void-700 p-7 text-center shadow-pop"
          >
            <button onClick={() => setReveal(null)} aria-label="Close" className="absolute right-3 top-3 text-ink-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
            <motion.div
              initial={{ rotate: -18, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal/20 text-teal"
            >
              <Gift className="h-8 w-8" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-4 inline-flex items-center gap-1.5 font-display text-4xl font-black tracking-tight text-teal"
            >
              <Sparkles className="h-6 w-6 text-amber" /> +{reveal.xp} XP
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 text-sm text-ink-dim">
              Quest complete — {reveal.label}
            </motion.p>
            <button onClick={() => setReveal(null)} className="btn-primary mt-6 w-full rounded-2xl py-3 text-sm shadow-glow">
              Collect
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
    </>
  );
}

/** Compact strip for the home page — a daily-return hook that links to profile. */
export function DailyStrip() {
  const p = useProgress();
  const lvl = levelInfo(p.xp);
  const claimed = p.quests.filter((q) => q.claimed).length;
  const claimable = p.quests.some((q) => q.progress >= q.goal && !q.claimed);

  return (
    <Link
      href="/profile"
      className="mx-auto mt-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-line bg-void-700 px-4 py-3 shadow-card transition-colors hover:border-line-strong"
    >
      <span className="flex items-center gap-1.5 text-amber">
        <Flame className="h-5 w-5" />
        <span className="nums text-lg font-bold">{p.streak}</span>
      </span>
      <div className="h-8 w-px bg-line" />
      <div className="flex items-center gap-1.5 text-ink">
        <Zap className="h-4 w-4 text-teal" />
        <span className="text-sm font-semibold">Lv {lvl.level}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className={cn("text-[12px]", claimable ? "font-semibold text-teal" : "text-ink-dim")}>
          {claimable ? "Rewards ready" : `Quests ${claimed}/${p.quests.length}`}
        </span>
        {claimable && <span className="h-2 w-2 animate-pulse-soft rounded-full bg-teal" />}
      </div>
    </Link>
  );
}
