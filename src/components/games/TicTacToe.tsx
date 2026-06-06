"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { Board, Cell, bestMove, evaluate } from "@/lib/games/tictactoe";
import { Difficulty } from "@/lib/difficulty";
import { play } from "@/lib/sfx";
import { randomBot } from "@/lib/bots";
import { recordResult } from "@/lib/progress";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar, BotFace } from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { MatchShell } from "./MatchShell";
import { ResultOverlay, ResultKind } from "./ResultOverlay";
import { Mark } from "./xo/Mark";

const EMPTY: Board = Array(9).fill(null);
const HUMAN: Cell = "X";
const AI: Cell = "O";

function emptyIdx(b: Board) {
  return b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
}

// AI move by difficulty: easy mostly random, normal half-optimal, hard perfect
function aiPick(b: Board, level: Difficulty): number {
  const open = emptyIdx(b);
  if (open.length === 0) return -1;
  const rand = () => open[Math.floor(Math.random() * open.length)];
  if (level === "easy") return Math.random() < 0.75 ? rand() : bestMove(b, "O");
  if (level === "normal") return Math.random() < 0.5 ? rand() : bestMove(b, "O");
  return bestMove(b, "O");
}

export function TicTacToe({ difficulty = "normal" }: { difficulty?: Difficulty }) {
  const [board, setBoard] = useState<Board>(EMPTY);
  const [turn, setTurn] = useState<Cell>(HUMAN);
  const [result, setResult] = useState<ResultKind>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [score, setScore] = useState({ you: 0, ai: 0, draw: 0 });
  const bot = useMemo(() => randomBot(), []);
  const [settings] = useSettings();
  const youName = settings.name || "You";

  const reset = useCallback(() => {
    setBoard(EMPTY);
    setTurn(HUMAN);
    setResult(null);
    setWinLine(null);
  }, []);

  const settle = useCallback((b: Board) => {
    const o = evaluate(b);
    if (o.winner) {
      setWinLine(o.line);
      setResult(o.winner === HUMAN ? "win" : "lose");
      setScore((s) => (o.winner === HUMAN ? { ...s, you: s.you + 1 } : { ...s, ai: s.ai + 1 }));
      play(o.winner === HUMAN ? "win" : "lose");
      recordResult("tic-tac-toe", o.winner === HUMAN ? "win" : "lose");
      return true;
    }
    if (o.draw) {
      setResult("draw");
      setScore((s) => ({ ...s, draw: s.draw + 1 }));
      recordResult("tic-tac-toe", "draw");
      return true;
    }
    return false;
  }, []);

  const mark = (i: number) => {
    if (board[i] || result || turn !== HUMAN) return;
    const next = [...board];
    next[i] = HUMAN;
    setBoard(next);
    play("place");
    if (settle(next)) return;
    setTurn(AI);
  };

  useEffect(() => {
    if (turn !== AI || result) return;
    const t = setTimeout(() => {
      const b = [...board];
      const move = aiPick(b, difficulty);
      if (move >= 0) b[move] = AI;
      setBoard(b);
      play("place");
      if (!settle(b)) setTurn(HUMAN);
    }, 460);
    return () => clearTimeout(t);
  }, [turn, board, result, settle, difficulty]);

  return (
    <MatchShell
      title="Tic-Tac-Toe"
      status={result ? "Round over" : turn === HUMAN ? "Your move" : "Opponent is thinking"}
      players={[
        {
          name: youName,
          mark: <Mark kind="X" />,
          active: turn === HUMAN && !result,
          accent: "text-violet-bright",
          avatar: <Avatar image={settings.avatarImage || undefined} color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.violet} name={youName} size={36} rounded="rounded-lg" />,
        },
        {
          name: bot.name,
          mark: <Mark kind="O" />,
          active: turn === AI && !result,
          accent: "text-teal",
          avatar: <BotFace bot={bot} size={36} rounded="rounded-lg" />,
        },
      ]}
    >
      <div className="flex w-full max-w-[330px] flex-col items-center">
        {/* scoreboard */}
        <div className="mb-4 flex w-full items-center justify-center gap-2 text-center">
          {[
            { label: "You", val: score.you, c: "text-violet-bright" },
            { label: "Draw", val: score.draw, c: "text-ink-faint" },
            { label: "AI", val: score.ai, c: "text-teal" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-xl border border-line bg-void-800 py-2">
              <p className={cn("nums text-xl font-semibold", s.c)}>{s.val}</p>
              <p className="text-[10px] text-ink-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {/* board: grid lines come from cell borders so marks always sit dead-center */}
        <div className="relative aspect-square w-full rounded-3xl border border-line bg-void-700 p-3 shadow-card">
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            {board.map((cell, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const inWin = winLine?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => mark(i)}
                  className={cn(
                    "relative grid place-items-center transition-colors",
                    col < 2 && "border-r-2 border-white/10",
                    row < 2 && "border-b-2 border-white/10",
                    !cell && !result && turn === HUMAN && "hover:bg-white/[0.04]",
                    inWin && "bg-[#f6d66b]/15"
                  )}
                >
                  <div className="pointer-events-none h-full w-full">
                    <AnimatePresence>{cell && <Mark key={cell} kind={cell} />}</AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>

          <ResultOverlay result={result} onRematch={reset} />
        </div>
      </div>
    </MatchShell>
  );
}
