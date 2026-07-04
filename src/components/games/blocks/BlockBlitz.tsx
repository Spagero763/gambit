"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
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

export function BlockBlitz({
  seed: seedProp,
  onSubmit,
  onExit,
}: {
  /** When set, everyone plays this exact board (tournament mode). */
  seed?: number;
  /** Fired with the final score each time a run ends (tournament mode). */
  onSubmit?: (score: number) => void;
  /** Replaces the "Lobby" link with a custom back action (tournament mode). */
  onExit?: () => void;
} = {}) {
  const tournament = seedProp !== undefined;
  const seed = useRef(seedProp ?? 7);
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
  const boardKick = useAnimationControls();
  const reduce = useReducedMotion();
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
    // tournament: replay the SAME board; free play: a fresh random board.
    seed.current = tournament ? (seedProp as number) : (Date.now() % 90000) + 11;
    const t = makePieces(rng);
    setGrid(emptyGrid());
    setTray(t);
    setSelected(t[0]?.id ?? null);
    setScore(0);
    setCombo(0);
    setOver(false);
    setHover(null);
  };

  const drop = (r: number, c: number, pc: Piece | null = piece) => {
    if (over || !pc) return;
    if (!canPlace(grid, pc, r, c)) return;

    const placed = place(grid, pc, r, c);
    const { grid: cleared, cleared: lines } = clearLines(placed);

    let nextCombo = combo;
    if (lines > 0) {
      nextCombo = Math.min(8, combo + 1);
      setFlash(`+${lines * 10 * nextCombo}${lines > 1 ? `  ×${lines}` : ""}`);
      setTimeout(() => setFlash(null), 700);
      play("clear");
      // screen kick that grows with the number of lines cleared
      if (!reduce) {
        const mag = Math.min(3 + lines * 2, 10);
        void boardKick.start({
          x: [0, -mag, mag, -mag * 0.6, mag * 0.6, 0],
          transition: { duration: 0.26, ease: "easeOut" },
        });
      }
    } else {
      nextCombo = 0;
      play("place");
    }
    setCombo(nextCombo);
    setScore((s) => s + pc.cells.length + lines * 10 * (lines > 0 ? nextCombo : 1));

    let nextTray = tray.filter((p) => p.id !== pc.id);
    if (nextTray.length === 0) nextTray = makePieces(rng);

    setGrid(cleared);
    setTray(nextTray);
    setSelected(nextTray[0]?.id ?? null);
    setHover(null);

    if (!anyMove(cleared, nextTray)) {
      const finalScore = score + pc.cells.length + lines * 10 * (lines > 0 ? nextCombo : 1);
      setBest((b) => Math.max(b, finalScore));
      setOver(true);
      play("lose");
      if (tournament) {
        onSubmit?.(finalScore); // server keeps each player's best run
      } else {
        recordResult("blocks", "draw"); // solo run — counts as a match played
        submitScore(address, "blocks", finalScore); // weekly events board
      }
    }
  };

  // Drag-to-place: grab a shape from the tray and drag it onto the board. Touch
  // captures the pointer to the tray button, so we hit-test the board by screen
  // coords (elementFromPoint) rather than relying on the cells' enter events.
  const cellFromPoint = (x: number, y: number): { r: number; c: number } | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell || cell.dataset.r === undefined || cell.dataset.c === undefined) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  };
  // anchor the piece so it sits just above the finger, centred horizontally
  const anchorFor = (p: Piece, hit: { r: number; c: number }) => ({
    r: hit.r - (p.h - 1),
    c: hit.c - Math.floor(p.w / 2),
  });

  const startDrag = (p: Piece) => {
    if (over) return;
    setSelected(p.id);
    const move = (e: PointerEvent) => {
      const hit = cellFromPoint(e.clientX, e.clientY);
      setHover(hit ? anchorFor(p, hit) : null);
    };
    const end = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const hit = cellFromPoint(e.clientX, e.clientY);
      if (hit) {
        const a = anchorFor(p, hit);
        drop(a.r, a.c, p);
      }
      setHover(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        {onExit ? (
          <button onClick={onExit} className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Tournament
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Lobby
          </Link>
        )}
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
        <motion.div
          animate={boardKick}
          data-coach="board"
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
                data-cell
                data-r={r}
                data-c={c}
                onPointerEnter={() => setHover({ r, c })}
                onPointerDown={() => {
                  setHover({ r, c });
                  drop(r, c);
                }}
                className={cn(
                  "relative touch-none rounded-[6px] transition-colors",
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
        </motion.div>

        {/* tray */}
        <div data-coach="tray" className="mt-4 grid grid-cols-3 gap-2.5">
          {tray.map((p) => {
            const active = p.id === selected;
            return (
              <button
                key={p.id}
                onPointerDown={() => startDrag(p)}
                className={cn(
                  "flex touch-none items-center justify-center rounded-2xl border py-4 transition-all",
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
          Drag a shape onto the board — or tap a shape, then tap a cell to drop it.
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
                {tournament && (
                  <p className="mt-2 text-[11px] text-teal">Run submitted. Your best score counts. Same board, try to beat it.</p>
                )}
                <button
                  onClick={reset}
                  className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm shadow-glow"
                >
                  <RotateCcw className="h-4 w-4" /> {tournament ? "Try again (same board)" : "Play again"}
                </button>
                {tournament && onExit && (
                  <button
                    onClick={onExit}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-void-800 py-3 text-sm text-ink-dim transition-colors hover:text-ink"
                  >
                    Back to standings
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
