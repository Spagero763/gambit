"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Board,
  Cell,
  bestMove,
  evaluate,
} from "@/lib/games/tictactoe";
import { cn } from "@/lib/cn";
import { MatchShell } from "./MatchShell";
import { ResultOverlay, ResultKind } from "./ResultOverlay";

const EMPTY: Board = Array(9).fill(null);
const HUMAN: Cell = "X";
const AI: Cell = "O";

export function TicTacToe() {
  const [board, setBoard] = useState<Board>(EMPTY);
  const [turn, setTurn] = useState<Cell>(HUMAN);
  const [result, setResult] = useState<ResultKind>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);

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
      return true;
    }
    if (o.draw) {
      setResult("draw");
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

  // AI move
  useEffect(() => {
    if (turn !== AI || result) return;
    const t = setTimeout(() => {
      const b = [...board];
      const move = bestMove(b, "O");
      if (move >= 0) b[move] = AI;
      setBoard(b);
      if (!settle(b)) setTurn(HUMAN);
    }, 480);
    return () => clearTimeout(t);
  }, [turn, board, result, settle]);

  return (
    <MatchShell
      title="Tic-Tac-Toe"
      status={
        result
          ? "Round over"
          : turn === HUMAN
          ? "Your move"
          : "Opponent is thinking"
      }
      players={[
        { name: "You", mark: "X", active: turn === HUMAN && !result, accent: "text-violet-bright" },
        { name: "Gambit AI", mark: "O", active: turn === AI && !result, accent: "text-teal" },
      ]}
    >
      <div className="relative">
        <div className="grid grid-cols-3 gap-2.5">
          {board.map((cell, i) => {
            const inWin = winLine?.includes(i);
            return (
              <motion.button
                key={i}
                onClick={() => play(i)}
                whileTap={{ scale: cell || result ? 1 : 0.93 }}
                className={cn(
                  "relative grid h-24 w-24 place-items-center rounded-2xl glass text-4xl font-bold transition-colors sm:h-28 sm:w-28",
                  !cell && !result && turn === HUMAN && "hover:bg-white/[0.06]",
                  inWin && "ring-2 ring-teal/70"
                )}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      key={cell}
                      initial={{ scale: 0, rotate: -30, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className={cn(
                        "font-display",
                        cell === "X" ? "text-violet-bright" : "text-teal"
                      )}
                    >
                      {cell}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        <ResultOverlay result={result} onRematch={reset} />
      </div>
    </MatchShell>
  );
}
