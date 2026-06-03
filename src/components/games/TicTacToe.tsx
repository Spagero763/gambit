"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Board, Cell, bestMove, evaluate } from "@/lib/games/tictactoe";
import { Difficulty } from "@/lib/difficulty";
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
      return true;
    }
    if (o.draw) {
      setResult("draw");
      setScore((s) => ({ ...s, draw: s.draw + 1 }));
      return true;
    }
    return false;
  }, []);

  const play = (i: number) => {
    if (board[i] || result || turn !== HUMAN) return;
    const next = [...board];
    next[i] = HUMAN;
    setBoard(next);
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
      if (!settle(b)) setTurn(HUMAN);
    }, 460);
    return () => clearTimeout(t);
  }, [turn, board, result, settle, difficulty]);

  return (
    <MatchShell
      title="Tic-Tac-Toe"
      status={result ? "Round over" : turn === HUMAN ? "Your move" : "Opponent is thinking"}
      players={[
        { name: "You", mark: <Mark kind="X" />, active: turn === HUMAN && !result, accent: "text-violet-bright" },
        { name: "Gambit AI", mark: <Mark kind="O" />, active: turn === AI && !result, accent: "text-teal" },
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
            <div key={s.label} className="flex-1 rounded-xl bg-white/[0.03] py-2">
              <p className={cn("font-display text-xl font-bold", s.c)}>{s.val}</p>
              <p className="text-[10px] text-ink-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {/* board: grid lines come from cell borders so marks always sit dead-center */}
        <div className="relative aspect-square w-full rounded-3xl glass p-3 shadow-card">
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            {board.map((cell, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const inWin = winLine?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => play(i)}
                  className={cn(
                    "relative grid place-items-center transition-colors",
                    col < 2 && "border-r-2 border-white/10",
                    row < 2 && "border-b-2 border-white/10",
                    !cell && !result && turn === HUMAN && "hover:bg-white/[0.04]",
                    inWin && "bg-amber/15"
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
