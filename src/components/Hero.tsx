"use client";

import Link from "next/link";
import { Play, Swords } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { HowItWorks } from "./HowItWorks";

/** Smooth-scroll to the games, the one thing a first-timer should do. */
function toGames(e: React.MouseEvent) {
  e.preventDefault();
  document.getElementById("games")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Renders visible from the server HTML, so the headline paints before the
 * wallet SDK hydrates; the lines under it ease in with CSS (`hero-in`).
 * Nothing here needs JS to become visible.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pt-3">
      {/* no entrance on the headline or the line under it: they are the first paint */}
      <h1 className="display text-[42px] font-extrabold leading-[1.02] text-ink min-[400px]:text-[46px]">
        Think you&apos;d win?
        <span className="block">
          <span className="text-ink-soft">Put money</span> <span className="text-shimmer">on it.</span>
        </span>
      </h1>

      <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-dim">
        Real opponents. Winner takes 95%.
      </p>

      <div className="hero-in mt-5 grid grid-cols-2 gap-2.5 sm:max-w-md" style={{ animationDelay: "60ms" }}>
        <a href="#games" onClick={toGames} className={buttonClass("primary", "lg", "w-full whitespace-nowrap px-3 text-[16px]")}>
          <Play className="h-4 w-4 shrink-0 fill-current" /> Play vs AI
        </a>
        <Link href="/lobby" className={buttonClass("secondary", "lg", "w-full whitespace-nowrap px-3 text-[16px]")}>
          <Swords className="h-4 w-4 shrink-0" /> 1v1 for money
        </Link>
      </div>

      <div className="hero-in mt-2" style={{ animationDelay: "120ms" }}>
        <HowItWorks />
      </div>
    </section>
  );
}
