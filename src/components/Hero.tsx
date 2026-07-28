"use client";

import { ShieldCheck, Coins, Cpu, Play } from "lucide-react";
import { HowItWorks } from "./HowItWorks";

const FACTS = [
  { icon: Cpu, label: "Warm up free" },
  { icon: Coins, label: "Winner takes 95%" },
  { icon: ShieldCheck, label: "Paid in seconds" },
];

/** Smooth-scroll to the games grid — the one thing a first-timer should do. */
function toGames(e: React.MouseEvent) {
  e.preventDefault();
  document.getElementById("games")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * The hero renders VISIBLE from the server HTML and animates in with pure CSS
 * (`hero-in`), so the largest-contentful headline paints immediately instead of
 * waiting for the wallet SDK to hydrate. This is the fix for the 15s mobile LCP.
 * Nothing here depends on JS to become visible.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pt-5">
      <h1
        className="hero-in mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.02em] text-ink"
      >
        <span className="block">Think you&apos;d win?</span>
        <span className="block">
          Put money on <span className="text-shimmer">it.</span>
        </span>
      </h1>

      <p className="hero-in mt-3 max-w-md text-[15px] leading-relaxed text-ink-dim" style={{ animationDelay: "0.08s" }}>
        The games you grew up playing, now with real opponents and a real pot.
        Winner takes 95%, paid to your wallet the second the game ends. Warm up
        free until you&apos;re ready.
      </p>

      <div className="hero-in mt-5 flex flex-wrap gap-2" style={{ animationDelay: "0.16s" }}>
        {FACTS.map((f) => {
          const Icon = f.icon;
          return (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-line-strong"
            >
              <Icon className="h-3.5 w-3.5 text-ink-faint" />
              {f.label}
            </span>
          );
        })}
        <HowItWorks />
      </div>

      {/* One clear primary action for a first-timer: play, free, no wallet, no
          sign-in. Everything else on the page can wait until they want it. */}
      <div className="hero-in mt-5" style={{ animationDelay: "0.24s" }}>
        <a
          href="#games"
          onClick={toGames}
          className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-[15px] shadow-glow"
        >
          <Play className="h-4 w-4 fill-void" /> Play a free game
        </a>
        <p className="mt-2 text-[12px] text-ink-faint">Free against the bot. No wallet, no sign in.</p>
      </div>
    </section>
  );
}
