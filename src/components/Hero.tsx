"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Counter } from "./Counter";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-ink-dim"
      >
        <Sparkles className="h-3.5 w-3.5 text-amber" />
        Play free. Stake when you are ready.
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.05 }}
        className="mt-4 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight"
      >
        Every move
        <br />
        <span className="text-gradient">is worth something.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.12 }}
        className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-dim"
      >
        Classic games of skill, head to head. Jump in for free, or back yourself
        with cUSD and the winner takes the pot.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.2 }}
        className="mt-6 grid grid-cols-3 gap-3"
      >
        {[
          { label: "Players online", node: <Counter to={552} /> },
          { label: "Matches today", node: <Counter to={1840} /> },
          { label: "Paid out", node: <Counter to={9.2} prefix="$" suffix="k" decimals={1} /> },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl glass px-3 py-3">
            <p className="font-display text-xl font-bold text-ink">{s.node}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
