"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Dices } from "lucide-react";
import { MatchShell } from "../MatchShell";
import { ResultOverlay, ResultKind } from "../ResultOverlay";
import { cn } from "@/lib/cn";

const LADDERS: Record<number, number> = { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 };
const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 99: 78 };

function centerFrac(n: number) {
  const idx = n - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const posInRow = idx % 10;
  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow;
  const rowFromTop = 9 - rowFromBottom;
  return { x: (col + 0.5) / 10, y: (rowFromTop + 0.5) / 10 };
}

function jumpTo(n: number) {
  return LADDERS[n] ?? SNAKES[n] ?? n;
}

export function SnakesLadders() {
  const posRef = useRef<[number, number]>([1, 1]);
  const [pos, setPos] = useState<[number, number]>([1, 1]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<ResultKind>(null);
  const busy = useRef(false);
  const seed = useRef(13);

  const youC = useAnimationControls();
  const aiC = useAnimationControls();

  const rng = () => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const offset = (p: number) => (p === 0 ? -2.2 : 2.2);

  const animateTo = useCallback(
    async (p: number, from: number, to: number) => {
      const controls = p === 0 ? youC : aiC;
      const lefts: string[] = [];
      const tops: string[] = [];
      for (let s = from + 1; s <= to; s++) {
        const c = centerFrac(s);
        lefts.push(`${c.x * 100 + offset(p)}%`);
        tops.push(`${c.y * 100}%`);
      }
      if (lefts.length === 0) return;
      await controls.start({
        left: lefts,
        top: tops,
        transition: { duration: Math.min(1.4, lefts.length * 0.13), ease: "easeInOut" },
      });
    },
    [youC, aiC]
  );

  const jumpAnim = useCallback(
    async (p: number, from: number, to: number) => {
      const controls = p === 0 ? youC : aiC;
      const c = centerFrac(to);
      await controls.start({
        left: `${c.x * 100 + offset(p)}%`,
        top: `${c.y * 100}%`,
        transition: { type: "spring", stiffness: 180, damping: 16 },
      });
    },
    [youC, aiC]
  );

  const roll = useCallback(
    async (p: 0 | 1) => {
      if (busy.current || result) return;
      busy.current = true;
      setRolling(true);

      // dice spin
      const final = 1 + Math.floor(rng() * 6);
      for (let i = 0; i < 8; i++) {
        setDice(1 + Math.floor(rng() * 6));
        await sleep(55);
      }
      setDice(final);
      setRolling(false);
      await sleep(180);

      const from = posRef.current[p];
      let to = from + final;

      if (to <= 100) {
        await animateTo(p, from, to);
        const j = jumpTo(to);
        if (j !== to) {
          await sleep(120);
          await jumpAnim(p, to, j);
          to = j;
        }
        posRef.current[p] = to;
        setPos([...posRef.current] as [number, number]);
      }
      // overshoot: stay put

      if (to >= 100) {
        setResult(p === 0 ? "win" : "lose");
        busy.current = false;
        return;
      }

      setTurn(p === 0 ? 1 : 0);
      busy.current = false;
    },
    [animateTo, jumpAnim, result]
  );

  // AI turn
  useEffect(() => {
    if (turn !== 1 || result) return;
    const t = setTimeout(() => roll(1), 750);
    return () => clearTimeout(t);
  }, [turn, result, roll]);

  const reset = () => {
    posRef.current = [1, 1];
    setPos([1, 1]);
    setTurn(0);
    setResult(null);
    setDice(1);
    busy.current = false;
    const c = centerFrac(1);
    youC.set({ left: `${c.x * 100 + offset(0)}%`, top: `${c.y * 100}%` });
    aiC.set({ left: `${c.x * 100 + offset(1)}%`, top: `${c.y * 100}%` });
  };

  const start1 = centerFrac(1);

  return (
    <MatchShell
      title="Snakes & Ladders"
      status={
        result
          ? "Game over"
          : turn === 0
          ? "Your roll"
          : "Opponent rolling"
      }
      players={[
        { name: "You", mark: "🟣", active: turn === 0 && !result, accent: "text-violet-bright" },
        { name: "Gambit AI", mark: "🟡", active: turn === 1 && !result, accent: "text-amber" },
      ]}
    >
      <div className="flex w-full max-w-[360px] flex-col items-center">
        <Board />

        {/* token layer wrapper shares the board's square via portal-like overlay */}
        <div className="mt-5 flex items-center gap-4">
          <Dice value={dice} rolling={rolling} />
          <button
            onClick={() => roll(0)}
            disabled={turn !== 0 || !!result || busy.current}
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
          First to 100 wins. Land exactly or overshoot and hold.
        </p>
      </div>

      <ResultOverlay result={result} onRematch={reset} />
    </MatchShell>
  );

  function Board() {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl glass p-2 shadow-card">
        {/* cells */}
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
                  (rowFromTop + colInRow) % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.015]",
                  isLadder && "bg-teal/10",
                  isSnake && "bg-rose/10"
                )}
              >
                <span className="m-[2px] text-ink-faint/70">{n}</span>
              </div>
            );
          })}
        </div>

        {/* connections */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-2"
          style={{ width: "calc(100% - 1rem)", height: "calc(100% - 1rem)" }}
        >
          {Object.entries(LADDERS).map(([f, t]) => (
            <Link key={`l${f}`} from={+f} to={+t} color="#27e1a6" />
          ))}
          {Object.entries(SNAKES).map(([f, t]) => (
            <Snake key={`s${f}`} from={+f} to={+t} />
          ))}
        </svg>

        {/* tokens */}
        <motion.div
          animate={youC}
          initial={false}
          style={{
            left: `${start1.x * 100 + offset(0)}%`,
            top: `${start1.y * 100}%`,
          }}
          className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-bright shadow-[0_0_10px_rgba(168,155,255,0.9)] ring-2 ring-white/40"
        />
        <motion.div
          animate={aiC}
          initial={false}
          style={{
            left: `${start1.x * 100 + offset(1)}%`,
            top: `${start1.y * 100}%`,
          }}
          className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_10px_rgba(255,193,94,0.9)] ring-2 ring-white/40"
        />
      </div>
    );
  }
}

function Link({ from, to, color }: { from: number; to: number; color: string }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100;
  const y1 = a.y * 100;
  const x2 = b.x * 100;
  const y2 = b.y * 100;
  // perpendicular for rails
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1.6;
  const py = (dx / len) * 1.6;
  const rungs = Array.from({ length: 5 }, (_, i) => (i + 1) / 6);
  return (
    <g stroke={color} strokeWidth={0.7} strokeLinecap="round" opacity={0.7}>
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} />
      {rungs.map((t, i) => (
        <line
          key={i}
          x1={x1 + dx * t + px}
          y1={y1 + dy * t + py}
          x2={x1 + dx * t - px}
          y2={y1 + dy * t - py}
        />
      ))}
    </g>
  );
}

function Snake({ from, to }: { from: number; to: number }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100;
  const y1 = a.y * 100;
  const x2 = b.x * 100;
  const y2 = b.y * 100;
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
  const my = (y1 + y2) / 2 + (x1 - x2) * 0.18;
  return (
    <g>
      <path
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke="#ff6b9a"
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.75}
      />
      <circle cx={x1} cy={y1} r={1.8} fill="#ff6b9a" />
    </g>
  );
}

function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <motion.div
      animate={rolling ? { rotate: [0, -18, 18, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
      className="grid h-14 w-14 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl glass p-2 shadow-card"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "m-auto h-2 w-2 rounded-full",
            pips[value].includes(i) ? "bg-ink" : "bg-transparent"
          )}
        />
      ))}
    </motion.div>
  );
}
