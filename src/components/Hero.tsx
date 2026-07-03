"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Coins, Cpu } from "lucide-react";
import { HowItWorks } from "./HowItWorks";
import { Magnetic } from "./motion/Magnetic";

const ease = [0.22, 1, 0.36, 1] as const;

const FACTS = [
  { icon: Cpu, label: "Warm up free" },
  { icon: Coins, label: "Winner takes 95%" },
  { icon: ShieldCheck, label: "Paid in seconds" },
];

// Headline as words so each one can rise out of a blur on its own spring.
const LINE_1 = ["Think", "you'd", "win?"];
const LINE_2 = ["Put", "money", "on"];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};
const word = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease },
  },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pt-5">
      <motion.h1
        variants={reduce ? undefined : container}
        initial={reduce ? { opacity: 0 } : "hidden"}
        animate={reduce ? { opacity: 1 } : "show"}
        className="mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.02em] text-ink"
        style={{ perspective: 600 }}
      >
        <span className="block">
          {LINE_1.map((w) => (
            <motion.span key={w} variants={word} className="mr-[0.32ch] inline-block will-change-transform">
              {w}
            </motion.span>
          ))}
        </span>
        <span className="block">
          {LINE_2.map((w) => (
            <motion.span key={w} variants={word} className="mr-[0.32ch] inline-block will-change-transform">
              {w}
            </motion.span>
          ))}
          <motion.span variants={word} className="text-shimmer inline-block will-change-transform">
            it.
          </motion.span>
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.42 }}
        className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-dim"
      >
        The games you grew up playing, now with real opponents and a real pot.
        Winner takes 95%, paid to your wallet the second the game ends. Warm up
        free until you&apos;re ready.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.52 }}
        className="mt-5 flex flex-wrap gap-2"
      >
        {FACTS.map((f, i) => {
          const Icon = f.icon;
          return (
            <Magnetic key={f.label} strength={0.25}>
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + i * 0.07, type: "spring", stiffness: 320, damping: 20 }}
                whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.2)" }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-dim"
              >
                <Icon className="h-3.5 w-3.5 text-ink-faint" />
                {f.label}
              </motion.span>
            </Magnetic>
          );
        })}
        <HowItWorks />
      </motion.div>
    </section>
  );
}
