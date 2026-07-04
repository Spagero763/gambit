"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { ACHIEVEMENTS, TIER_COLOR, isUnlocked, useNewAchievements } from "@/lib/achievements";
import { Confetti } from "@/components/motion/Confetti";
import { cn } from "@/lib/cn";

/** Badge grid for the profile — unlocked ones glow, locked show progress. */
export function Achievements() {
  const p = useProgress();
  const unlockedCount = ACHIEVEMENTS.filter((a) => isUnlocked(a, p)).length;

  return (
    <div>
      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Award className="h-4 w-4 text-amber" /> Achievements
        </h2>
        <span className="nums text-[12px] text-ink-faint">
          {unlockedCount}/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a, i) => {
          const { value, goal } = a.measure(p);
          const done = value >= goal;
          const pct = Math.min(100, Math.round((value / goal) * 100));
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border px-2 py-3 text-center",
                done ? "border-line-strong bg-void-700" : "border-line bg-void-800"
              )}
              style={done ? { boxShadow: `inset 0 0 0 1px ${TIER_COLOR[a.tier]}40` } : undefined}
            >
              <span
                className={cn("text-2xl leading-none transition", !done && "opacity-30 grayscale")}
                style={done ? { filter: `drop-shadow(0 2px 6px ${TIER_COLOR[a.tier]}55)` } : undefined}
              >
                {a.icon}
              </span>
              <span className={cn("mt-1.5 text-[11px] font-semibold leading-tight", done ? "text-ink" : "text-ink-faint")}>{a.name}</span>
              {done ? (
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: TIER_COLOR[a.tier] }}>
                  {a.tier}
                </span>
              ) : (
                <>
                  <span className="nums mt-0.5 text-[9px] text-ink-faint">{value}/{goal}</span>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-void-600">
                    <div className="h-full rounded-full bg-ink-faint" style={{ width: `${pct}%` }} />
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Global celebratory toast when an achievement unlocks. Mount once (layout). */
export function AchievementToast() {
  const p = useProgress();
  const { newly, dismiss } = useNewAchievements(p);
  const current = newly[0];

  return (
    <AnimatePresence>
      {current && (
        <motion.button
          key={current.id}
          onClick={dismiss}
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="fixed inset-x-0 top-4 z-[80] mx-auto flex w-[min(92%,22rem)] items-center gap-3 rounded-2xl border bg-void-700/98 px-4 py-3 text-left shadow-pop backdrop-blur"
          style={{ borderColor: `${TIER_COLOR[current.tier]}66` }}
        >
          <Confetti count={28} />
          <motion.span
            animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.9, repeat: 2 }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl"
            style={{ background: `${TIER_COLOR[current.tier]}22` }}
          >
            {current.icon}
          </motion.span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: TIER_COLOR[current.tier] }}>
              Achievement unlocked
            </span>
            <span className="block truncate text-sm font-bold text-ink">{current.name}</span>
            <span className="block truncate text-[11px] text-ink-dim">{current.desc}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
