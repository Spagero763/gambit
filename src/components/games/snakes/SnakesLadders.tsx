"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dices } from "lucide-react";
import { MatchShell } from "../MatchShell";
import { ResultOverlay, ResultKind } from "../ResultOverlay";
import { THEMES, SnakeTheme } from "./themes";
import { Difficulty } from "@/lib/difficulty";
import { play } from "@/lib/sfx";
import { randomBot } from "@/lib/bots";
import { recordResult } from "@/lib/progress";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar, BotFace } from "@/components/Avatar";
import { cn } from "@/lib/cn";

// Layout shifts with difficulty: easy is ladder-heavy, hard is snake-heavy.
const LAYOUTS: Record<Difficulty, { ladders: Record<number, number>; snakes: Record<number, number> }> = {
  easy: {
    ladders: { 3: 22, 5: 27, 9: 31, 21: 42, 28: 84, 36: 57, 51: 67, 71: 91, 80: 99 },
    snakes: { 47: 26, 62: 19, 87: 36 },
  },
  normal: {
    ladders: { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 },
    snakes: { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 99: 78 },
  },
  hard: {
    ladders: { 8: 26, 36: 44, 51: 67 },
    snakes: { 16: 6, 24: 5, 32: 10, 48: 30, 56: 19, 62: 18, 64: 60, 78: 39, 87: 36, 93: 73, 95: 56, 98: 79 },
  },
};

function centerFrac(n: number) {
  const idx = Math.max(1, n) - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const posInRow = idx % 10;
  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow;
  const rowFromTop = 9 - rowFromBottom;
  return { x: (col + 0.5) / 10, y: (rowFromTop + 0.5) / 10 };
}

type Layout = { ladders: Record<number, number>; snakes: Record<number, number> };

function jumpTo(n: number, layout: Layout) {
  return layout.ladders[n] ?? layout.snakes[n] ?? n;
}

const OFFSET = (p: number) => (p === 0 ? -2.2 : 2.2);

export function SnakesLadders({ difficulty = "normal" }: { difficulty?: Difficulty }) {
  const layout = LAYOUTS[difficulty];
  const bot = useMemo(() => randomBot(), []);
  const [settings] = useSettings();
  const youName = settings.name || "You";
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
      play("roll");

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
        play("place");

        const dest = jumpTo(landing, layout);
        if (dest !== landing) {
          setMoving({ p, frames: [landing, dest] });
          play(dest > landing ? "clear" : "lose"); // ladder up vs snake down
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
          play(p === 0 ? "win" : "lose");
          recordResult("snakes", p === 0 ? "win" : "lose");
          busy.current = false;
          return;
        }
      }
      // overshoot (landing > 100): hold position, pass turn

      setTurn(p === 0 ? 1 : 0);
      busy.current = false;
    },
    [pos, result, layout]
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
        {
          name: youName,
          mark: <Token color="violet" />,
          active: turn === 0 && !result,
          accent: "text-violet-bright",
          avatar: <Avatar image={settings.avatarImage || undefined} color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.violet} name={youName} size={36} rounded="rounded-lg" />,
        },
        {
          name: bot.name,
          mark: <Token color="amber" />,
          active: turn === 1 && !result,
          accent: "text-amber",
          avatar: <BotFace bot={bot} size={36} rounded="rounded-lg" />,
        },
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
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                theme.id === t.id ? "border-line-strong bg-void-600 text-ink" : "border-transparent text-ink-faint hover:text-ink-dim"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Board theme={theme} tokenPos={tokenPos} layout={layout} />

        <div className="mt-5 flex items-center gap-4">
          <Dice value={dice} rolling={rolling} />
          <button
            onClick={() => roll(0)}
            disabled={turn !== 0 || !!result}
            className={cn(
              "btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm shadow-glow transition-opacity",
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

// A board-game "meeple" person silhouette: head, arms out, two legs.
const MEEPLE_PATH =
  "M50 5C40 5 33 13 33 22C33 28 36 33 41 36C30 39 22 47 17 58C15 62 17 67 22 67L36 67C36 67 33 75 33 82C33 90 40 95 50 95C60 95 67 90 67 82C67 75 64 67 64 67L78 67C83 67 85 62 83 58C78 47 70 39 59 36C64 33 67 28 67 22C67 13 60 5 50 5Z";

const TOKEN_HEX: Record<"violet" | "amber", string> = { violet: "#8e8bf0", amber: "#e3b341" };

function Meeple({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.55))" }}>
      <path d={MEEPLE_PATH} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={6} strokeLinejoin="round" />
      <path
        d="M50 9C42 9 36 15 36 22C36 27 38 31 42 34"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Token({ color }: { color: "violet" | "amber" }) {
  return <Meeple color={TOKEN_HEX[color]} className="block h-5 w-4" />;
}

function Board({
  theme,
  tokenPos,
  layout,
}: {
  theme: SnakeTheme;
  tokenPos: (p: 0 | 1) => { left: string | string[]; top: string | string[] };
  layout: Layout;
}) {
  const { ladders, snakes } = layout;
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
          const isLadder = n in ladders;
          const isSnake = n in snakes;
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
        {Object.entries(ladders).map(([f, t]) => (
          <Ladder key={`l${f}`} from={+f} to={+t} color={theme.ladder} />
        ))}
        {Object.entries(snakes).map(([f, t]) => (
          <SnakePath key={`s${f}`} from={+f} to={+t} color={theme.snake} />
        ))}
      </svg>

      <motion.div
        animate={you}
        transition={{ duration: Array.isArray(you.left) ? Math.min(1.3, you.left.length * 0.13) : 0.45, ease: "easeInOut" }}
        className="absolute z-20 h-[26px] w-[21px] -translate-x-1/2 -translate-y-[62%]"
      >
        <Meeple color={TOKEN_HEX.violet} className="h-full w-full" />
      </motion.div>
      <motion.div
        animate={ai}
        transition={{ duration: Array.isArray(ai.left) ? Math.min(1.3, ai.left.length * 0.13) : 0.45, ease: "easeInOut" }}
        className="absolute z-10 h-[26px] w-[21px] -translate-x-1/2 -translate-y-[62%]"
      >
        <Meeple color={TOKEN_HEX.amber} className="h-full w-full" />
      </motion.div>
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
  const count = Math.max(4, Math.round(len / 9));
  const rungs = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
  return (
    <g strokeLinecap="round">
      {/* dark backing for depth */}
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} stroke="rgba(0,0,0,0.4)" strokeWidth={1.8} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} stroke="rgba(0,0,0,0.4)" strokeWidth={1.8} />
      {/* rails */}
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} stroke={color} strokeWidth={1.1} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} stroke={color} strokeWidth={1.1} />
      {/* rungs */}
      {rungs.map((t, i) => (
        <line
          key={i}
          x1={x1 + dx * t + px}
          y1={y1 + dy * t + py}
          x2={x1 + dx * t - px}
          y2={y1 + dy * t - py}
          stroke={color}
          strokeWidth={0.9}
        />
      ))}
    </g>
  );
}

function SnakePath({ from, to, color }: { from: number; to: number; color: string }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100, y1 = a.y * 100, x2 = b.x * 100, y2 = b.y * 100; // head at `from` (higher cell)
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len; // unit perpendicular
  const amp = Math.min(11, len * 0.2);
  // S-shaped body via a cubic with alternating perpendicular control points
  const c1x = x1 + dx * 0.33 + px * amp, c1y = y1 + dy * 0.33 + py * amp;
  const c2x = x1 + dx * 0.66 - px * amp, c2y = y1 + dy * 0.66 - py * amp;
  const body = `M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
  // head faces away from the body (tangent points toward c1, mouth is opposite)
  const hx = c1x - x1, hy = c1y - y1, hl = Math.hypot(hx, hy) || 1;
  const ux = hx / hl, uy = hy / hl;
  const headAngle = (Math.atan2(uy, ux) * 180) / Math.PI;
  const tipx = x1 - ux * 4.5, tipy = y1 - uy * 4.5; // tongue tip in front of mouth

  return (
    <g strokeLinecap="round">
      {/* shadow / outline */}
      <path d={body} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={5} />
      {/* main body */}
      <path d={body} fill="none" stroke={color} strokeWidth={3.4} />
      {/* belly highlight */}
      <path d={body} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.1} />
      {/* scale pattern */}
      <path d={body} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={3} strokeDasharray="0.5 3.4" />

      {/* forked tongue */}
      <g stroke="#ff3b5c" strokeWidth={0.7}>
        <line x1={x1 - ux * 1.5} y1={y1 - uy * 1.5} x2={tipx} y2={tipy} />
        <line x1={tipx} y1={tipy} x2={tipx - uy * 1.3} y2={tipy + ux * 1.3} />
        <line x1={tipx} y1={tipy} x2={tipx + uy * 1.3} y2={tipy - ux * 1.3} />
      </g>

      {/* head */}
      <ellipse cx={x1} cy={y1} rx={3.4} ry={2.7} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={0.5} transform={`rotate(${headAngle} ${x1} ${y1})`} />
      {/* eyes */}
      <circle cx={x1 + px * 1.3 - ux * 0.4} cy={y1 + py * 1.3 - uy * 0.4} r={0.85} fill="#fff" />
      <circle cx={x1 - px * 1.3 - ux * 0.4} cy={y1 - py * 1.3 - uy * 0.4} r={0.85} fill="#fff" />
      <circle cx={x1 + px * 1.3 - ux * 0.4} cy={y1 + py * 1.3 - uy * 0.4} r={0.4} fill="#111" />
      <circle cx={x1 - px * 1.3 - ux * 0.4} cy={y1 - py * 1.3 - uy * 0.4} r={0.4} fill="#111" />
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
      className="grid h-14 w-14 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl border border-line bg-void-700 p-2 shadow-card"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={cn("m-auto h-2 w-2 rounded-full", pips[value].includes(i) ? "bg-ink" : "bg-transparent")} />
      ))}
    </motion.div>
  );
}
