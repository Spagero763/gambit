"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Game, accentMap } from "@/lib/games";
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

  // pointer-driven 3D tilt + spotlight
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 200, damping: 18 });
  const sx = useTransform(px, (v) => `${v * 100}%`);
  const sy = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(240px circle at ${sx} ${sy}, rgba(255,255,255,0.12), transparent 65%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease, delay: index * 0.07 }}
      className={featured ? "col-span-2" : ""}
      style={{ perspective: 1000 }}
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
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.985 }}
          style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          className={cn(
            "group relative overflow-hidden rounded-[1.6rem] glass p-3 shadow-card ring-1",
            a.ring
          )}
        >
          {/* art panel */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl bg-gradient-to-br",
              a.grad,
              featured ? "h-36" : "h-24"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
            {/* moving sheen */}
            <motion.div
              aria-hidden
              className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/10 blur-md"
              animate={{ x: ["0%", "320%"] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                repeatDelay: 2.4,
                ease: "easeInOut",
                delay: index * 0.4,
              }}
            />
            <motion.span
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
              className={cn(
                "absolute inset-0 grid place-items-center drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]",
                featured ? "text-6xl" : "text-4xl"
              )}
            >
              {game.glyph}
            </motion.span>

            {/* live players */}
            <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-void/50 px-2 py-1 backdrop-blur-sm">
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-glow", a.dot)} />
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink">
                <Users className="h-2.5 w-2.5" />
                {game.players}
              </span>
            </div>

            <span className="absolute left-2 top-2 rounded-full bg-void/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ink-dim backdrop-blur-sm">
              {game.mode}
            </span>
          </div>

          {/* spotlight overlay */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
            style={{ background: spotlight }}
          />

          {/* body */}
          <div className="relative px-1 pb-1 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink">{game.name}</h3>
              <ArrowUpRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  a.text
                )}
              />
            </div>
            <p className={cn("text-[11px] font-medium", a.text)}>{game.tagline}</p>

            {featured && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
                {game.description}
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-1 text-[10px] text-ink-faint">
              <span>Min stake</span>
              <span className="font-mono text-ink-dim">{game.minStake.toFixed(2)} cUSD</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
