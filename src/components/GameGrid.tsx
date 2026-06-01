"use client";

import { motion } from "framer-motion";
import { GAMES } from "@/lib/games";
import { GameCard } from "./GameCard";

export function GameGrid() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mb-4 flex items-end justify-between"
      >
        <h2 className="font-display text-lg font-bold">Pick your game</h2>
        <span className="text-xs text-ink-faint">{GAMES.length} games</span>
      </motion.div>

      <div className="grid grid-cols-2 gap-3.5">
        {GAMES.map((game, i) => (
          <GameCard key={game.slug} game={game} index={i} />
        ))}
      </div>
    </section>
  );
}
