"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Users, Play } from "lucide-react";
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

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [4, -4]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-4, 4]), { stiffness: 200, damping: 20 });
  const sx = useTransform(px, (v) => `${v * 100}%`);
  const sy = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${sx} ${sy}, rgba(255,255,255,0.10), transparent 60%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease, delay: index * 0.06 }}
      className={featured ? "col-span-2" : ""}
      style={{ perspective: 1100 }}
    >
      <Link href={`/play/${game.slug}`} className="block">
        <motion.div
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            px.set((e.clientX - r.left) / r.width);
            py.set((e.clientY - r.top) / r.height);
          }}
          onPointerLeave={() => {
            px.set(0.5);
            py.set(0.5);
          }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-white/8 shadow-card",
            featured ? "h-52" : "h-44"
          )}
        >
          {/* cover art */}
          <GameCover art={game.art} className="absolute inset-0 h-full w-full" />

          {/* bottom scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* spotlight on hover */}
          <motion.div className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />

          {/* top row */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-md bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
              {game.mode}
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 backdrop-blur-sm">
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-glow", a.dot)} />
              <span className="flex items-center gap-1 text-[10px] font-semibold text-white">
                <Users className="h-2.5 w-2.5" />
                {game.players}
              </span>
            </span>
          </div>

          {/* bottom content */}
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <h3 className="font-display text-lg font-bold leading-tight text-white">
              {game.name}
            </h3>
            <p className={cn("text-[11px] font-semibold", a.text)}>{game.tagline}</p>

            {featured && (
              <p className="mt-1.5 max-w-[80%] text-xs leading-relaxed text-white/65">
                {game.description}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-white/55">
                Min{" "}
                <span className="font-mono text-white/80">{game.minStake.toFixed(2)} cUSD</span>
              </span>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-black transition-transform group-hover:scale-105",
                  game.accent === "violet" && "bg-violet-bright",
                  game.accent === "teal" && "bg-teal",
                  game.accent === "amber" && "bg-amber",
                  game.accent === "rose" && "bg-rose"
                )}
              >
                <Play className="h-3 w-3 fill-black" />
                Play
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
