"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Coins, Cpu } from "lucide-react";
import { HowItWorks } from "./HowItWorks";

const ease = [0.22, 1, 0.36, 1] as const;

const FACTS = [
  { icon: Cpu, label: "Free vs the engine" },
  { icon: Coins, label: "95% to the winner" },
  { icon: ShieldCheck, label: "Settled on-chain" },
];

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pt-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1 text-xs text-ink-dim"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal" />
        Skill games on Celo
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.04 }}
        className="mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.02em] text-ink"
      >
        Play classic games.
        <br />
        Back yourself for cUSD.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.1 }}
        className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-dim"
      >
        Chess, Whot, tic-tac-toe, snakes &amp; ladders and a block puzzle. Practise
        free against the engine, or put cUSD on a 1v1 — the winner takes the pot.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.16 }}
        className="mt-5 flex flex-wrap gap-2"
      >
        {FACTS.map((f) => {
          const Icon = f.icon;
          return (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-dim"
            >
              <Icon className="h-3.5 w-3.5 text-ink-faint" />
              {f.label}
            </span>
          );
        })}
        <HowItWorks />
      </motion.div>
    </section>
  );
}
