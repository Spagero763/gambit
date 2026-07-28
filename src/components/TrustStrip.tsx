"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, LineChart, Code2, ExternalLink, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Portal } from "@/components/Portal";

const ESCROW = "0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05";

// The "you don't have to trust us" surface. A slim always-visible bar keeps the
// signal on the page (reviewers said trust info was hidden), and it opens the
// full, verifiable detail as a popup so it stays compact.
const LINKS = [
  {
    href: `https://celoscan.io/address/${ESCROW}`,
    icon: ShieldCheck,
    label: "Verified contract",
    sub: "The escrow that holds every stake",
  },
  {
    href: "https://dune.com/spagero763/gambit-analytics",
    icon: LineChart,
    label: "On-chain analytics",
    sub: "Every match and payout, public",
  },
  {
    href: "https://github.com/Spagero763/gambit",
    icon: Code2,
    label: "Open source",
    sub: "Read the code yourself",
  },
];

export function TrustStrip() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-4 lg:max-w-6xl">
      {/* compact bar — the passive trust signal, always visible */}
      <button
        onClick={() => setOpen(true)}
        className="pressable flex w-full items-center gap-2.5 rounded-2xl border border-line bg-void-800/60 px-4 py-3 transition-colors hover:border-teal/40"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-teal" />
        <span className="min-w-0 flex-1 text-left text-[12px] text-ink-dim">
          <span className="font-semibold text-ink">Don&apos;t trust us. Verify it.</span> Every stake and payout is public
          on-chain.
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
      </button>

      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[120] grid place-items-end bg-void/80 backdrop-blur-md sm:place-items-center"
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="w-full rounded-t-3xl border border-line bg-void-700 p-5 shadow-pop sm:w-[min(92%,26rem)] sm:rounded-3xl"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[15px] font-semibold tracking-tight text-ink">Don&apos;t trust us. Verify it.</p>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-faint hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mb-4 text-[12px] leading-snug text-ink-faint">
                  Your stake sits in a contract nobody can touch, and the winner is paid on-chain. All of it is public.
                </p>

                <div className="space-y-2.5">
                  {LINKS.map((l, i) => (
                    <motion.a
                      key={l.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.06, type: "spring", stiffness: 340, damping: 24 }}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start gap-3 rounded-2xl border border-line bg-void-800 p-3.5 transition-colors hover:border-teal/40"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
                        <l.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                          {l.label}
                          <ExternalLink className="h-3 w-3 text-ink-faint transition-colors group-hover:text-teal" />
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{l.sub}</span>
                      </span>
                    </motion.a>
                  ))}
                </div>

                <p className="mt-3 text-center text-[11px] text-ink-faint">
                  Prefer the in-app view?{" "}
                  <Link
                    href="/stats"
                    onClick={() => setOpen(false)}
                    className="text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
                  >
                    Live stats
                  </Link>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </section>
  );
}
