"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Portal } from "@/components/Portal";
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
  initialBest,
}: {
  /** When set, everyone plays this exact board (tournament mode). */
  seed?: number;
  /** Fired with the final score each time a run ends (tournament mode). */
  onSubmit?: (score: number) => void;
  /** Replaces the "Lobby" link with a custom back action (tournament mode). */
  onExit?: () => void;
  /** Your best score so far this round/week, so replays show the real target. */
  initialBest?: number;
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
  const [best, setBest] = useState(initialBest ?? 0);
  // the caller's best can arrive after mount (async fetch), never lose it
  useEffect(() => {
    if (initialBest) setBest((b) => Math.max(b, initialBest));
  }, [initialBest]);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const boardKick = useAnimationControls();
  const reduce = useReducedMotion();
  const [over, setOver] = useState(false);
  const { address } = useAccount();
  // the piece "held" under the finger while dragging, so it is always visible
  const [ghost, setGhost] = useState<{ p: Piece; x: number; y: number } | null>(null);

  // Free play deals a fresh board on every visit. The seed starts deterministic
  // so the first server/client paint matches (no hydration mismatch), then we
  // reseed on the client, otherwise the constant seed dealt the identical
  // opening pieces every single game. Tournaments keep their fixed seed.
  const dealt = useRef(false);
  useEffect(() => {
    if (tournament || dealt.current) return;
    dealt.current = true;
    seed.current = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) & 0x7fffffff) || 1;
    const t = makePieces(rng);
    setTray(t);
    setSelected(t[0]?.id ?? null);
  }, [tournament, rng]);

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

    // spatial: the sound comes from the column the piece landed in
    const pan = (c / (GRID - 1)) * 1.6 - 0.8;

    let nextCombo = combo;
    if (lines > 0) {
      nextCombo = Math.min(8, combo + 1);
      setFlash(`+${lines * 10 * nextCombo}${lines > 1 ? `  ×${lines}` : ""}`);
      setTimeout(() => setFlash(null), 700);
      // combos climb: each one pitches the sparkle up, so a streak SOUNDS like a streak
      play("clear", { pan, pitch: 1 + (nextCombo - 1) * 0.08 });
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
      play("place", { pan });
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
        recordResult("blocks", "draw"); // solo run, counts as a match played
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

  const startDrag = (p: Piece, e: React.PointerEvent) => {
    if (over) return;
    setSelected(p.id);
    setGhost({ p, x: e.clientX, y: e.clientY });
    const move = (ev: PointerEvent) => {
      const hit = cellFromPoint(ev.clientX, ev.clientY);
      setHover(hit ? anchorFor(p, hit) : null);
      setGhost({ p, x: ev.clientX, y: ev.clientY });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const hit = cellFromPoint(ev.clientX, ev.clientY);
      if (hit) {
        const a = anchorFor(p, hit);
        drop(a.r, a.c, p);
      }
      setHover(null);
      setGhost(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
        {onExit ? (
          <button onClick={onExit} aria-label="Back to the cup" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link href="/" data-nav="back" aria-label="Back to games" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="display min-w-0 flex-1 truncate text-[24px] font-extrabold text-ink">Block Blitz</h1>
        <AnimatePresence>
          {combo > 1 && (
            <motion.span
              key="combo"
              initial={{ scale: 0.6, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="display nums rounded-full bg-amber/15 px-3 py-1.5 text-[14px] font-bold text-amber"
            >
              Combo ×{combo}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* stat bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-[18px] px-4 py-3">
          <p className="text-[12px] font-semibold text-ink-faint">Score</p>
          <motion.p key={score} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="display nums text-[28px] font-extrabold leading-tight text-ink">
            {score.toLocaleString()}
          </motion.p>
        </div>
        <div className="glass rounded-[18px] px-4 py-3">
          <p className="text-[12px] font-semibold text-ink-faint">Best</p>
          <p className="display nums text-glow text-[28px] font-extrabold leading-tight">{Math.max(best, score).toLocaleString()}</p>
        </div>
      </div>

      {/* board */}
      <div className="relative mx-auto mt-5 w-full max-w-[360px]">
        <motion.div
          animate={boardKick}
          data-coach="board"
          className="relative grid aspect-square grid-cols-8 gap-1 rounded-tile border border-white/10 p-2.5"
          style={{
            background: "radial-gradient(120% 90% at 50% 0%, #24183f 0%, #130d26 55%, #0a0816 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 2px 14px rgba(0,0,0,0.5), 0 30px 60px -30px rgba(0,0,0,0.9)",
          }}
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
                onPointerDown={(e) => startDrag(p, e)}
                className={cn(
                  "flex touch-none items-center justify-center rounded-[18px] py-4 transition-shadow",
                  active ? "border border-teal/50 bg-teal/10 shadow-[0_0_28px_-8px_rgba(62,224,155,0.7)]" : "glass"
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

        <p className="mt-3 text-center text-[12px] text-ink-faint">
          Drag a shape onto the board, or tap a shape and then a square.
        </p>

        {/* the piece held under the finger while dragging. Portaled to <body> so
            the board's shake transform can't trap this fixed element, and lifted
            above the finger so it is never hidden by the thumb. */}
        {ghost && (
          <Portal>
            <div
              className="pointer-events-none fixed z-[200] drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)]"
              style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, calc(-100% - 18px))" }}
            >
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${ghost.p.w}, 34px)` }}>
                {Array.from({ length: ghost.p.w * ghost.p.h }).map((_, i) => {
                  const gr = Math.floor(i / ghost.p.w);
                  const gc = i % ghost.p.w;
                  const on = ghost.p.cells.some(([cr, cc]) => cr === gr && cc === gc);
                  return <span key={i} className="relative h-[34px] w-[34px]">{on && <Block accent={ghost.p.color} />}</span>;
                })}
              </div>
            </div>
          </Portal>
        )}

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
                className="panel w-[84%] rounded-[24px] p-6 text-center"
              >
                <p className="display text-[26px] font-extrabold text-ink">No room left</p>
                <p className="display nums mt-1 text-[40px] font-extrabold leading-none text-ink">{score.toLocaleString()}</p>
                <p className="mt-1 text-[13px] text-ink-dim">{score >= best && score > 0 ? "New best" : `Best ${Math.max(best, score).toLocaleString()}`}</p>
                {tournament && (
                  <p className="mt-2 text-[11px] text-teal">Run submitted. Your best score counts. Same board, try to beat it.</p>
                )}
                <button
                  onClick={reset}
                  className="btn-primary pressable mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px]"
                >
                  <RotateCcw className="h-4 w-4" /> {tournament ? "Try again (same board)" : "Play again"}
                </button>
                {tournament && onExit && (
                  <button
                    onClick={onExit}
                    className="btn-glass mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px]"
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
