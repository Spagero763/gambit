"use client";

import { GAMES } from "@/lib/games";
import { GameTile, WhotHero } from "@/components/home/GameTile";

export function GameGrid() {
  const rest = GAMES.filter((g) => g.slug !== "whot");

  return (
    <section id="games" data-tour="games" className="mx-auto w-full max-w-2xl scroll-mt-4 px-5 pb-6 pt-8 lg:max-w-6xl">
      <h2 className="display mb-3.5 text-[22px] font-extrabold text-ink">Games</h2>

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
