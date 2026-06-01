"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Users, Lock } from "lucide-react";
import Link from "next/link";
import { Game, accentMap } from "@/lib/games";
import { cn } from "@/lib/cn";

const ease = [0.22, 1, 0.36, 1] as const;

export function GameCard({ game, index }: { game: Game; index: number }) {
  const a = accentMap[game.accent];
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${mx}% ${my}%, rgba(255,255,255,0.10), transparent 70%)`;

  const live = game.status === "live";

  const inner = (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl glass p-4 shadow-card transition-shadow",
        live ? "ring-1 " + a.ring : "opacity-90"
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: spotlight }}
      />

      {/* corner glyph art */}
      <div
        className={cn(
          "pointer-events-none absolute -right-3 -top-4 select-none text-[5.5rem] leading-none opacity-10 transition-opacity group-hover:opacity-20",
          a.text
        )}
      >
        {game.glyph}
      </div>

      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            live ? "bg-white/5 text-ink" : "bg-white/5 text-ink-faint"
          )}
        >
          {live ? (
            <span className={cn("h-1.5 w-1.5 rounded-full", a.dot, "animate-pulse-glow")} />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {live ? game.mode : "Soon"}
        </span>

        {live && (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
            <Users className="h-3 w-3" />
            {game.players}
          </span>
        )}
      </div>

      <h3 className="relative mt-7 font-display text-lg font-bold text-ink">
        {game.name}
      </h3>
      <p className={cn("relative text-xs font-medium", a.text)}>{game.tagline}</p>
      <p className="relative mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-dim">
        {game.description}
      </p>

      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-[11px] text-ink-faint">
          Min stake{" "}
          <span className="font-mono text-ink-dim">
            {game.minStake.toFixed(2)} cUSD
          </span>
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold",
            live ? "bg-white/10 text-ink group-hover:bg-white/15" : "bg-white/5 text-ink-faint"
          )}
        >
          {live ? "Play →" : "Notify me"}
        </span>
      </div>
    </motion.div>
  );

  if (!live) return inner;
  return <Link href={`/play/${game.slug}`}>{inner}</Link>;
}
