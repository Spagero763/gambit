"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Game, accentMap } from "@/lib/games";
import { GameCover } from "./art/GameCover";
import { cn } from "@/lib/cn";

const ease = [0.22, 1, 0.36, 1] as const;

export function GameCard({
  game,
  index,
  featured = false,
}: {
  game: Game;
  index: number;
  featured?: boolean;
}) {
  const a = accentMap[game.accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease, delay: Math.min(index * 0.05, 0.3) }}
      className={featured ? "col-span-2" : ""}
    >
      <Link href={`/play/${game.slug}`} className="group block">
        <motion.div
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-line bg-void-700 shadow-card transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-line-strong",
            featured ? "h-52" : "h-44"
          )}
        >
          <GameCover art={game.art} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          {/* hover sheen */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

          {/* top meta */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
              {game.mode}
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 transition-colors group-hover:text-white">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* bottom content */}
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-white">
              {game.name}
            </h3>
            <p className={cn("mt-0.5 text-[12px] font-medium", a.text)}>{game.tagline}</p>

            {featured && (
              <p className="mt-1.5 max-w-[82%] text-[12px] leading-relaxed text-white/60">
                {game.description}
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/55">
              {game.mode === "solo" ? (
                <span>Solo · score to climb</span>
              ) : (
                <>
                  <span>Min</span>
                  <span className="nums font-mono text-white/80">
                    {game.minStake.toFixed(2)} cUSD
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
