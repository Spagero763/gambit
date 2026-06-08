"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import {
  Accent,
  GRID,
  Grid,
  Piece,
  anyMove,
  canPlace,
  clearLines,
  emptyGrid,
  makePieces,
  place,
} from "@/lib/games/blocks";
import { useAccount } from "wagmi";
import { play } from "@/lib/sfx";
import { recordResult } from "@/lib/progress";
import { submitScore } from "@/lib/scores";
import { cn } from "@/lib/cn";

const FILL: Record<Accent, string> = {
  violet: "bg-gradient-to-br from-violet-bright to-violet-deep",
  teal: "bg-gradient-to-br from-teal to-teal-deep",
  amber: "bg-gradient-to-br from-amber to-[#d99633]",
  rose: "bg-gradient-to-br from-rose to-[#d6437a]",
};

/** A glossy, beveled block tile. */
function Block({ accent, className }: { accent: Accent; className?: string }) {
  return (
    <span
      className={cn("absolute inset-0 overflow-hidden rounded-[6px]", FILL[accent], className)}
      style={{
        boxShadow:
          "inset 0 2px 1px rgba(255,255,255,0.45), inset 0 -3px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      <span className="absolute inset-x-0 top-0 h-1/3 rounded-t-[6px] bg-white/25" />
    </span>
  );
}

export function BlockBlitz() {
  const seed = useRef(7);
  const rng = useCallback(() => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  }, []);

  const [grid, setGrid] = useState<Grid>(() => emptyGrid());
  const [tray, setTray] = useState<Piece[]>(() => makePieces(rng));
  const [selected, setSelected] = useState<string | null>(tray[0]?.id ?? null);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const { address } = useAccount();

  const piece = useMemo(() => tray.find((p) => p.id === selected) ?? null, [tray, selected]);

  const preview = useMemo(() => {
    if (!piece || !hover) return null;
    const ok = canPlace(grid, piece, hover.r, hover.c);
    const cells = new Set(piece.cells.map(([r, c]) => `${hover.r + r}-${hover.c + c}`));
    return { ok, cells };
  }, [piece, hover, grid]);

  const reset = () => {
    seed.current = (Date.now() % 90000) + 11;
    const t = makePieces(rng);
    setGrid(emptyGrid());
    setTray(t);
    setSelected(t[0]?.id ?? null);
    setScore(0);
    setCombo(0);
    setOver(false);
    setHover(null);
  };

  const drop = (r: number, c: number) => {
    if (over || !piece) return;
    if (!canPlace(grid, piece, r, c)) return;

    const placed = place(grid, piece, r, c);
    const { grid: cleared, cleared: lines } = clearLines(placed);

    let nextCombo = combo;
    if (lines > 0) {
      nextCombo = Math.min(8, combo + 1);
      setFlash(`+${lines * 10 * nextCombo}${lines > 1 ? `  ×${lines}` : ""}`);
      setTimeout(() => setFlash(null), 700);
      play("clear");
    } else {
      nextCombo = 0;
      play("place");
    }
    setCombo(nextCombo);
    setScore((s) => s + piece.cells.length + lines * 10 * (lines > 0 ? nextCombo : 1));

    let nextTray = tray.filter((p) => p.id !== piece.id);
    if (nextTray.length === 0) nextTray = makePieces(rng);

    setGrid(cleared);
    setTray(nextTray);
    setSelected(nextTray[0]?.id ?? null);
    setHover(null);

    if (!anyMove(cleared, nextTray)) {
      const finalScore = score + piece.cells.length + lines * 10 * (lines > 0 ? nextCombo : 1);
      setBest((b) => Math.max(b, finalScore));
      setOver(true);
      play("lose");
      recordResult("blocks", "draw"); // solo run — counts as a match played
      submitScore(address, "blocks", finalScore); // weekly events board
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <AnimatePresence>
          {combo > 1 && (
            <motion.span
              key="combo"
              initial={{ scale: 0.6, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="rounded-full bg-amber/15 px-3 py-1.5 text-xs font-bold text-amber"
            >
              Combo ×{combo}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* stat bar */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-void-700 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Score</p>
          <motion.p key={score} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="nums text-2xl font-semibold tracking-tight text-ink">
            {score.toLocaleString()}
          </motion.p>
        </div>
        <div className="rounded-2xl border border-line bg-void-700 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Best</p>
          <p className="nums text-2xl font-semibold tracking-tight text-teal">{Math.max(best, score).toLocaleString()}</p>
        </div>
      </div>

      {/* board */}
      <div className="relative mx-auto mt-5 w-full max-w-[360px]">
        <div
          className="relative grid aspect-square grid-cols-8 gap-1 rounded-3xl border border-white/10 bg-[#0c0b18] p-2.5 shadow-card"
          style={{ boxShadow: "inset 0 2px 14px rgba(0,0,0,0.6), 0 20px 50px -20px rgba(0,0,0,0.8)" }}
          onPointerLeave={() => setHover(null)}
        >
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const r = Math.floor(i / GRID);
            const c = i % GRID;
            const fill = grid[r][c];
            const inPreview = preview?.cells.has(`${r}-${c}`);
            return (
              <button
                key={i}
                onPointerEnter={() => setHover({ r, c })}
                onPointerDown={() => {
                  setHover({ r, c });
                  drop(r, c);
                }}
                className={cn(
                  "relative rounded-[6px] transition-colors",
                  fill ? "" : "bg-white/[0.04]",
                  inPreview && (preview?.ok ? "ring-2 ring-teal/70" : "ring-2 ring-rose/60")
                )}
              >
                <AnimatePresence>
                  {fill && (
                    <motion.span
                      key={fill}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.2, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 360, damping: 22 }}
                      className="absolute inset-0"
                    >
                      <Block accent={fill} />
                    </motion.span>
                  )}
                </AnimatePresence>
                {inPreview && !fill && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[6px]",
                      preview?.ok ? "bg-teal/25" : "bg-rose/20"
                    )}
                  />
                )}
              </button>
            );
          })}

          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <span className="rounded-full bg-void/70 px-4 py-2 font-display text-xl font-bold text-amber backdrop-blur-sm">
                  {flash}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* tray */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {tray.map((p) => {
            const active = p.id === selected;
            return (
              <button
                key={p.id}
                onPointerDown={() => setSelected(p.id)}
                className={cn(
                  "flex items-center justify-center rounded-2xl border py-4 transition-all",
                  active ? "border-line-strong bg-void-700" : "border-line bg-void-800"
                )}
              >
                <div
                  className="grid gap-[3px]"
                  style={{
                    gridTemplateColumns: `repeat(${p.w}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: p.w * p.h }).map((_, i) => {
                    const r = Math.floor(i / p.w);
                    const c = i % p.w;
                    const on = p.cells.some(([cr, cc]) => cr === r && cc === c);
                    return (
                      <span key={i} className="relative h-3.5 w-3.5">
                        {on && <Block accent={p.color} />}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Tap a shape, then tap the board to drop it.
        </p>

        <AnimatePresence>
          {over && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center"
            >
              <motion.div
                initial={{ scale: 0.85, y: 14 }}
                animate={{ scale: 1, y: 0 }}
                className="w-[78%] rounded-3xl border border-line bg-void-700 p-6 text-center shadow-pop"
              >
                <p className="text-2xl font-semibold tracking-tight text-rose">No moves left</p>
                <p className="mt-1 text-sm text-ink-dim">Final score {score}</p>
                <button
                  onClick={reset}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm shadow-glow"
                >
                  <RotateCcw className="h-4 w-4" /> Play again
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
