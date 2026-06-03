"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Board, Cell, bestMove, evaluate, LINES } from "@/lib/games/tictactoe";
import { cn } from "@/lib/cn";
import { MatchShell } from "./MatchShell";
import { ResultOverlay, ResultKind } from "./ResultOverlay";
import { Mark } from "./xo/Mark";

const EMPTY: Board = Array(9).fill(null);
const HUMAN: Cell = "X";
const AI: Cell = "O";

// center coordinates per cell index, in a 0..300 grid, for the win line
const C = [50, 150, 250];
function cellCenter(i: number) {
  return { x: C[i % 3], y: C[Math.floor(i / 3)] };
}

export function TicTacToe() {
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
      setScore((s) =>
        o.winner === HUMAN ? { ...s, you: s.you + 1 } : { ...s, ai: s.ai + 1 }
      );
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
      const move = bestMove(b, "O");
      if (move >= 0) b[move] = AI;
      setBoard(b);
      if (!settle(b)) setTurn(HUMAN);
    }, 460);
    return () => clearTimeout(t);
  }, [turn, board, result, settle]);

  const lineCoords = winLine
    ? { a: cellCenter(winLine[0]), b: cellCenter(winLine[2]) }
    : null;

  return (
    <MatchShell
      title="Tic-Tac-Toe"
      status={result ? "Round over" : turn === HUMAN ? "Your move" : "Opponent is thinking"}
      players={[
        { name: "You", mark: <Mark kind="X" />, active: turn === HUMAN && !result, accent: "text-violet-bright" },
        { name: "Gambit AI", mark: <Mark kind="O" />, active: turn === AI && !result, accent: "text-teal" },
      ]}
    >
      <div className="flex w-full max-w-[340px] flex-col items-center">
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

        <div className="relative aspect-square w-full rounded-3xl glass p-3 shadow-card">
          {/* grid lines */}
          <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]">
            <g stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="100" y1="14" x2="100" y2="286" />
              <line x1="200" y1="14" x2="200" y2="286" />
              <line x1="14" y1="100" x2="286" y2="100" />
              <line x1="14" y1="200" x2="286" y2="200" />
            </g>
            {lineCoords && (
              <motion.line
                x1={lineCoords.a.x} y1={lineCoords.a.y}
                x2={lineCoords.b.x} y2={lineCoords.b.y}
                stroke="#ffc15e" strokeWidth="7" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                style={{ filter: "drop-shadow(0 0 8px rgba(255,193,94,0.6))" }}
              />
            )}
          </svg>

          {/* cells */}
          <div className="grid h-full w-full grid-cols-3">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => play(i)}
                className={cn(
                  "relative grid place-items-center rounded-xl transition-colors",
                  !cell && !result && turn === HUMAN && "hover:bg-white/[0.04]"
                )}
              >
                <AnimatePresence>{cell && <Mark key={cell} kind={cell} />}</AnimatePresence>
              </button>
            ))}
          </div>

          <ResultOverlay result={result} onRematch={reset} />
        </div>
      </div>
    </MatchShell>
  );
}
