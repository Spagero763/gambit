"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { FREE_BOARD, STAKED_BOARD, Ranked } from "@/lib/leaderboard";
import { cn } from "@/lib/cn";

type Tab = "free" | "staked";
type Range = "week" | "all";

export function Leaderboard() {
  const [tab, setTab] = useState<Tab>("staked");
  const [range, setRange] = useState<Range>("week");
  const rows = tab === "free" ? FREE_BOARD : STAKED_BOARD;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-2xl font-bold"
      >
        Leaderboard
      </motion.h1>
      <p className="mt-1 text-sm text-ink-dim">Who is taking the pots.</p>

      {/* Free / Staked */}
      <div className="mt-5 grid grid-cols-2 rounded-2xl glass p-1">
        {(
          [
            { id: "staked", label: "Staked" },
            { id: "free", label: "Free" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative rounded-xl py-2.5 text-sm font-semibold"
          >
            {tab === t.id && (
              <motion.span
                layoutId="lbTab"
                className="absolute inset-0 rounded-xl bg-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={cn("relative", tab === t.id ? "text-ink" : "text-ink-faint")}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Week / All-time */}
      <div className="mt-3 flex gap-2">
        {(
          [
            { id: "week", label: "This week" },
            { id: "all", label: "All-time" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              range === r.id ? "bg-white/10 text-ink" : "text-ink-faint"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.ul
          key={tab + range}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-4 space-y-2"
        >
          {rows.map((row, i) => (
            <Row key={row.handle} row={row} tab={tab} index={i} />
          ))}
        </motion.ul>
      </AnimatePresence>
    </section>
  );
}

function Row({ row, tab, index }: { row: Ranked; tab: Tab; index: number }) {
  const top = row.rank <= 3;
  const medal = ["text-amber", "text-ink-dim", "text-[#c08457]"][row.rank - 1];

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3",
        top ? "glass ring-1 ring-white/10" : "bg-white/[0.03]"
      )}
    >
      <div className="grid w-7 place-items-center">
        {top ? (
          <Crown className={cn("h-4 w-4", medal)} />
        ) : (
          <span className="font-mono text-sm text-ink-faint">{row.rank}</span>
        )}
      </div>

      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-deep to-teal-deep text-xs font-bold text-white">
        {row.handle.slice(0, 2).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-ink">{row.handle}</p>
        <p className="text-[11px] text-ink-faint">
          {row.region} · {row.wins}W {row.losses}L
        </p>
      </div>

      <div className="text-right">
        {tab === "staked" ? (
          <p className="font-display text-sm font-bold text-teal">
            {row.won.toFixed(2)} <span className="text-[10px] text-ink-faint">cUSD</span>
          </p>
        ) : (
          <p className="font-display text-sm font-bold text-violet-bright">
            {row.xp.toLocaleString()} <span className="text-[10px] text-ink-faint">XP</span>
          </p>
        )}
      </div>
    </motion.li>
  );
}
