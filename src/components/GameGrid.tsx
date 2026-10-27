"use client";

import Link from "next/link";
import { Swords, BarChart3, Trophy } from "lucide-react";
import { GAMES } from "@/lib/games";
import { GameTile, WhotHero } from "@/components/home/GameTile";

export function GameGrid() {
  const rest = GAMES.filter((g) => g.slug !== "whot");

  return (
    <section id="games" data-tour="games" className="mx-auto w-full max-w-2xl scroll-mt-4 px-5 pb-6 pt-8 lg:max-w-6xl">
      <div className="mb-3.5 flex items-end justify-between">
        <h2 className="display text-[22px] font-extrabold text-ink">Games</h2>
        <div className="flex items-center gap-3.5">
          <Link href="/stats" className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-ink-dim transition-colors hover:text-ink">
            <BarChart3 className="h-3.5 w-3.5" /> Stats
          </Link>
          <Link href="/tournaments" className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-amber">
            <Trophy className="h-3.5 w-3.5" /> Cups
          </Link>
          <Link href="/lobby" className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-teal">
            <Swords className="h-3.5 w-3.5" /> Live rooms
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr] lg:gap-4">
        <div className="enter">
          <WhotHero />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          {rest.map((game, i) => (
            <div key={game.slug} className="enter" style={{ animationDelay: `${80 + i * 60}ms` }}>
              <GameTile game={game} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
