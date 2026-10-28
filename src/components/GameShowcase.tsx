"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Play } from "lucide-react";
import Link from "next/link";
import { ChessScene } from "./showcase/ChessScene";
import { XOScene } from "./showcase/XOScene";
import { SnakesScene } from "./showcase/SnakesScene";
import { BlocksScene } from "./showcase/BlocksScene";
import { WhotScene } from "./showcase/WhotScene";
import { cn } from "@/lib/cn";

const DURATION = 5000;

const SHOW = [
  { slug: "chess", name: "Chess", tagline: "Real pieces. Real clock.", accent: "#8e8bf0", Scene: ChessScene },
  { slug: "tic-tac-toe", name: "Tic-Tac-Toe", tagline: "Three in a row, fast.", accent: "#3ecf8e", Scene: XOScene },
  { slug: "snakes", name: "Snakes & Ladders", tagline: "Roll, climb, slide.", accent: "#e3b341", Scene: SnakesScene },
  { slug: "blocks", name: "Block Blitz", tagline: "Fill rows, chain combos.", accent: "#e06c8b", Scene: BlocksScene },
  { slug: "whot", name: "Naija Whot", tagline: "Shapes, specials, shed.", accent: "#aaa7ff", Scene: WhotScene },
] as const;

export function GameShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // off-screen it holds still, so it costs nothing while you're elsewhere on the page
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const still = paused || !inView;
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);

  useEffect(() => {
    if (still) return;
    timer.current = setTimeout(() => setI((p) => (p + 1) % SHOW.length), DURATION);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [i, still]);

  const active = SHOW[i];
  const Scene = active.Scene;

  return (
    <section ref={ref} className="mx-auto w-full max-w-2xl px-5 pt-4 lg:max-w-4xl">
      <div
        className="relative overflow-hidden rounded-3xl border border-line bg-void-700 shadow-pop"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* stage */}
        <Link href={`/play/${active.slug}`} className="block" aria-label={`Play ${active.name}`}>
          <div className="relative aspect-[16/11] w-full">
            {/* ambient accent wash, tweened per game */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: `radial-gradient(90% 80% at 50% 0%, ${active.accent}22, transparent 70%)`,
              }}
              transition={{ duration: 0.6 }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, x: 42, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -32, scale: 1.02 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {/* slow Ken Burns drift while the scene is on stage */}
                <motion.div
                  key={`kb-${active.slug}`}
                  className="absolute inset-0"
                  initial={{ scale: 1 }}
                  animate={{ scale: still ? 1.02 : 1.055 }}
                  transition={{ duration: DURATION / 1000, ease: "linear" }}
                >
                  {seen && <Scene />}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* bottom scrim + caption */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pt-12">
              <div className="flex items-end justify-between">
                <div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active.slug}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-lg font-semibold tracking-tight text-white">{active.name}</h3>
                      <p className="text-[14px] text-white/65">{active.tagline}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span className="relative inline-flex">
                  {/* breathing ring drawing the eye to the CTA */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ background: active.accent }}
                    animate={still ? { scale: 1, opacity: 0 } : { scale: [1, 1.35], opacity: [0.45, 0] }}
                    transition={still ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold text-void shadow-glow"
                    style={{ background: active.accent }}
                  >
                    <Play className="h-3.5 w-3.5 fill-void" />
                    Play
                  </motion.span>
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* segmented progress / tabs: a 4px bar inside a full thumb-tall button */}
        <div className="flex gap-1.5 px-4">
          {SHOW.map((s, idx) => (
            <button key={s.slug} onClick={() => setI(idx)} className="group flex h-11 flex-1 items-center" aria-label={`Show ${s.name}`}>
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                {idx < i && <span className="absolute inset-0 bg-white/40" />}
                {idx === i && (
                  <motion.span
                    key={`fill-${i}-${still}`}
                    className="absolute inset-0 origin-left"
                    style={{ background: s.accent }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: still ? 0.3 : 1 }}
                    transition={{ duration: still ? 0.3 : DURATION / 1000, ease: "linear" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
