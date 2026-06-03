"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { MatchShell } from "../MatchShell";
import { ResultOverlay, ResultKind } from "../ResultOverlay";
import { THEMES, SnakeTheme } from "./themes";
import { cn } from "@/lib/cn";

const LADDERS: Record<number, number> = { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 };
const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 99: 78 };

function centerFrac(n: number) {
  const idx = Math.max(1, n) - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const posInRow = idx % 10;
  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow;
  const rowFromTop = 9 - rowFromBottom;
  return { x: (col + 0.5) / 10, y: (rowFromTop + 0.5) / 10 };
}

function jumpTo(n: number) {
  return LADDERS[n] ?? SNAKES[n] ?? n;
}

const OFFSET = (p: number) => (p === 0 ? -2.2 : 2.2);

export function SnakesLadders() {
  const [pos, setPos] = useState<[number, number]>([1, 1]);
  const [moving, setMoving] = useState<{ p: 0 | 1; frames: number[] } | null>(null);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<ResultKind>(null);
  const [theme, setTheme] = useState<SnakeTheme>(THEMES[0]);
  const busy = useRef(false);
  const seed = useRef(13);

  const rng = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const roll = useCallback(
    async (p: 0 | 1) => {
      if (busy.current || result) return;
      busy.current = true;
      setRolling(true);

      const face = 1 + Math.floor(rng() * 6);
      for (let i = 0; i < 8; i++) {
        setDice(1 + Math.floor(rng() * 6));
        await sleep(55);
      }
      setDice(face);
      setRolling(false);
      await sleep(160);

      const from = pos[p];
      const landing = from + face;

      if (landing <= 100) {
        // hop along the path
        const frames: number[] = [];
        for (let s = from; s <= landing; s++) frames.push(s);
        setMoving({ p, frames });
        await sleep(Math.min(1300, (landing - from) * 130) + 120);

        const dest = jumpTo(landing);
        if (dest !== landing) {
          setMoving({ p, frames: [landing, dest] });
          await sleep(480);
        }
        setPos((prev) => {
          const next = [...prev] as [number, number];
          next[p] = dest;
          return next;
        });
        setMoving(null);

        if (dest >= 100) {
          setResult(p === 0 ? "win" : "lose");
          busy.current = false;
          return;
        }
      }
      // overshoot (landing > 100): hold position, pass turn

      setTurn(p === 0 ? 1 : 0);
      busy.current = false;
    },
    [pos, result]
  );

  useEffect(() => {
    if (turn !== 1 || result) return;
    const t = setTimeout(() => roll(1), 720);
    return () => clearTimeout(t);
  }, [turn, result, roll]);

  const reset = () => {
    setPos([1, 1]);
    setMoving(null);
    setTurn(0);
    setResult(null);
    setDice(1);
    busy.current = false;
  };

  // position descriptor for a token: keyframe arrays while moving, else fixed
  const tokenPos = (p: 0 | 1) => {
    if (moving && moving.p === p) {
      return {
        left: moving.frames.map((n) => `${centerFrac(n).x * 100 + OFFSET(p)}%`),
        top: moving.frames.map((n) => `${centerFrac(n).y * 100}%`),
      };
    }
    const c = centerFrac(pos[p]);
    return { left: `${c.x * 100 + OFFSET(p)}%`, top: `${c.y * 100}%` };
  };

  return (
    <MatchShell
      title="Snakes & Ladders"
      status={result ? "Game over" : turn === 0 ? "Your roll" : "Opponent rolling"}
      players={[
        { name: "You", mark: <Token color="violet" />, active: turn === 0 && !result, accent: "text-violet-bright" },
        { name: "Gambit AI", mark: <Token color="amber" />, active: turn === 1 && !result, accent: "text-amber" },
      ]}
    >
      <div className="flex w-full max-w-[360px] flex-col items-center">
        {/* theme switcher */}
        <div className="mb-3 flex gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                theme.id === t.id ? "bg-white/12 text-ink" : "text-ink-faint hover:text-ink-dim"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Board theme={theme} tokenPos={tokenPos} />

        <div className="mt-5 flex items-center gap-4">
          <Dice value={dice} rolling={rolling} />
          <button
            onClick={() => roll(0)}
            disabled={turn !== 0 || !!result}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold shadow-glow transition-opacity",
              "bg-gradient-to-r from-violet-deep to-violet text-white",
              (turn !== 0 || !!result) && "opacity-40"
            )}
          >
            <Dices className="h-4 w-4" /> Roll
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Roll exactly onto 100 to win. Overshoot and you hold.
        </p>
      </div>

      <ResultOverlay result={result} onRematch={reset} />
    </MatchShell>
  );
}

function Token({ color }: { color: "violet" | "amber" }) {
  const bg =
    color === "violet"
      ? "radial-gradient(circle at 35% 30%, #c9bfff, #5b4ee0)"
      : "radial-gradient(circle at 35% 30%, #ffe1a8, #d99633)";
  return <span className="block h-3.5 w-3.5 rounded-full ring-2 ring-white/50" style={{ background: bg }} />;
}

function Board({
  theme,
  tokenPos,
}: {
  theme: SnakeTheme;
  tokenPos: (p: 0 | 1) => { left: string | string[]; top: string | string[] };
}) {
  const you = tokenPos(0);
  const ai = tokenPos(1);
  return (
    <div
      className={cn("relative aspect-square w-full overflow-hidden rounded-3xl border p-2 shadow-card", theme.border)}
      style={{ background: theme.boardBg, boxShadow: "inset 0 2px 20px rgba(0,0,0,0.5), 0 20px 50px -20px rgba(0,0,0,0.8)" }}
    >
      <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-px">
        {Array.from({ length: 100 }).map((_, i) => {
          const rowFromTop = Math.floor(i / 10);
          const colInRow = i % 10;
          const rowFromBottom = 9 - rowFromTop;
          const leftToRight = rowFromBottom % 2 === 0;
          const base = rowFromBottom * 10;
          const n = leftToRight ? base + colInRow + 1 : base + (10 - colInRow);
          const isLadder = n in LADDERS;
          const isSnake = n in SNAKES;
          return (
            <div
              key={i}
              className={cn(
                "relative flex items-start justify-start rounded-[3px] text-[7px] leading-none",
                isLadder && theme.ladderCell,
                isSnake && theme.snakeCell
              )}
              style={{
                background: isLadder || isSnake ? undefined : (rowFromTop + colInRow) % 2 === 0 ? theme.cellLight : theme.cellDark,
              }}
            >
              <span className="m-[2px]" style={{ color: theme.num }}>{n}</span>
            </div>
          );
        })}
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-2" style={{ width: "calc(100% - 1rem)", height: "calc(100% - 1rem)" }}>
        {Object.entries(LADDERS).map(([f, t]) => (
          <Ladder key={`l${f}`} from={+f} to={+t} color={theme.ladder} />
        ))}
        {Object.entries(SNAKES).map(([f, t]) => (
          <SnakePath key={`s${f}`} from={+f} to={+t} color={theme.snake} />
        ))}
      </svg>

      <motion.div
        animate={you}
        transition={{ duration: Array.isArray(you.left) ? Math.min(1.3, you.left.length * 0.13) : 0.45, ease: "easeInOut" }}
        className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/50"
        style={{ background: "radial-gradient(circle at 35% 30%, #c9bfff, #5b4ee0)", boxShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
      />
      <motion.div
        animate={ai}
        transition={{ duration: Array.isArray(ai.left) ? Math.min(1.3, ai.left.length * 0.13) : 0.45, ease: "easeInOut" }}
        className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/50"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffe1a8, #d99633)", boxShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
}

function Ladder({ from, to, color }: { from: number; to: number; color: string }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100, y1 = a.y * 100, x2 = b.x * 100, y2 = b.y * 100;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1.6, py = (dx / len) * 1.6;
  const rungs = [1, 2, 3, 4, 5].map((i) => i / 6);
  return (
    <g stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.8}>
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} />
      {rungs.map((t, i) => (
        <line key={i} x1={x1 + dx * t + px} y1={y1 + dy * t + py} x2={x1 + dx * t - px} y2={y1 + dy * t - py} />
      ))}
    </g>
  );
}

function SnakePath({ from, to, color }: { from: number; to: number; color: string }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100, y1 = a.y * 100, x2 = b.x * 100, y2 = b.y * 100;
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
  const my = (y1 + y2) / 2 + (x1 - x2) * 0.18;
  return (
    <g>
      <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
      <circle cx={x1} cy={y1} r={1.8} fill={color} />
    </g>
  );
}

function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  const pips: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <motion.div
      animate={rolling ? { rotate: [0, -18, 18, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
      className="grid h-14 w-14 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl glass p-2 shadow-card"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={cn("m-auto h-2 w-2 rounded-full", pips[value].includes(i) ? "bg-ink" : "bg-transparent")} />
      ))}
    </motion.div>
  );
}
