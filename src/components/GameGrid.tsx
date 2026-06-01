"use client";

import { motion } from "framer-motion";
import { GAMES } from "@/lib/games";
import { GameCard } from "./GameCard";

export function GameGrid() {
  const [featured, ...rest] = GAMES;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-4 flex items-end justify-between"
      >
        <h2 className="font-display text-lg font-bold">Pick your game</h2>
        <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal">
          {GAMES.length} live
        </span>
      </motion.div>

      <div className="grid grid-cols-2 gap-3.5">
        <GameCard game={featured} index={0} featured />
        {rest.map((game, i) => (
          <GameCard key={game.slug} game={game} index={i + 1} />
        ))}
      </div>
    </section>
  );
}
