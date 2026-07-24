"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Game, accentMap } from "@/lib/games";
import { GameCover } from "./art/GameCover";
import { Tilt } from "./motion/Tilt";
import { settle, ease } from "@/lib/motion";
import { cn } from "@/lib/cn";

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
  // press ripple radiating from the exact touch point — the tactile feedback
  // phones deserve (all the hover polish is invisible on touch screens)
  const [ripple, setRipple] = useState<{ key: number; x: number; y: number } | null>(null);

  return (
    <motion.div variants={settle} className={featured ? "col-span-2" : ""}>
      <Link href={`/play/${game.slug}`} className="group block">
        <Tilt max={featured ? 6 : 9}>
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setRipple({ key: Date.now(), x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-line bg-void-700 shadow-card transition-[border-color,box-shadow] duration-300 group-hover:border-line-strong group-hover:shadow-pop",
              featured ? "h-52" : "h-44"
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            <GameCover art={game.art} className="absolute inset-0 h-full w-full" />

            {/* touch ripple from the press point */}
            <AnimatePresence>
              {ripple && (
                <motion.span
                  key={ripple.key}
                  initial={{ scale: 0, opacity: 0.35 }}
                  animate={{ scale: 3.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease }}
                  onAnimationComplete={() => setRipple(null)}
                  className="pointer-events-none absolute h-32 w-32 rounded-full"
                  style={{
                    left: ripple.x - 64,
                    top: ripple.y - 64,
                    background: "radial-gradient(circle, rgba(255,255,255,0.5), transparent 65%)",
                  }}
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

            {/* top meta — floats above the surface in 3D */}
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-between p-3"
              style={{ transform: "translateZ(22px)" }}
            >
              <span className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
                {game.mode}
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-sm transition-all duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-black">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* bottom content — deeper parallax layer */}
            <div
              className="absolute inset-x-0 bottom-0 p-3.5"
              style={{ transform: "translateZ(30px)" }}
            >
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
                      {game.minStake.toFixed(2)} USDm
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* orbiting accent ring — only the 1px border area shows */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                padding: 1,
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                overflow: "hidden",
              }}
            >
              <span
                className="absolute -inset-[100%] animate-[spin_3.2s_linear_infinite] [animation-play-state:paused] group-hover:[animation-play-state:running]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0 62%, rgba(62,207,142,0.9) 76%, rgba(170,167,255,0.85) 86%, transparent 96%)",
                }}
              />
            </span>
          </motion.div>
        </Tilt>
      </Link>
    </motion.div>
  );
}
