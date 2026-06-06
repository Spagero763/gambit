"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
import { GAMES } from "@/lib/games";
import { GameCard } from "./GameCard";

export function GameGrid() {
  const [featured, ...rest] = GAMES;
  const live = GAMES.filter((g) => g.status === "live").length;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-7">
      <div className="mb-3.5 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Games</h2>
          <span className="text-[12px] text-ink-faint">{live} live</span>
        </div>
        <Link href="/lobby" className="flex items-center gap-1 text-[12px] font-medium text-teal transition-opacity hover:opacity-80">
          <Swords className="h-3.5 w-3.5" /> Live rooms
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GameCard game={featured} index={0} featured />
        {rest.map((game, i) => (
          <GameCard key={game.slug} game={game} index={i + 1} />
        ))}
      </div>
    </section>
  );
}
