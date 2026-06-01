"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, Square } from "chess.js";
import { motion } from "framer-motion";
import { chooseMove } from "@/lib/games/chess-ai";
import { cn } from "@/lib/cn";
import { MatchShell } from "./MatchShell";
import { ResultOverlay, ResultKind } from "./ResultOverlay";

const GLYPH: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const START_TIME = 300; // 5 minutes per side

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null);
  const [result, setResult] = useState<ResultKind>(null);
  const [wTime, setWTime] = useState(START_TIME);
  const [bTime, setBTime] = useState(START_TIME);

  const game = gameRef.current;
  const turn = game.turn(); // 'w' human, 'b' AI

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setLast(null);
    setResult(null);
    setWTime(START_TIME);
    setBTime(START_TIME);
  }, []);

  const settle = useCallback(() => {
    const g = gameRef.current;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) {
      const loser = g.turn();
      setResult(loser === "w" ? "lose" : "win");
    } else {
      setResult("draw");
    }
    return true;
  }, []);

  // Legal targets for the currently selected square.
  const targets = useMemo(() => {
    if (!selected) return new Map<Square, Move>();
    const map = new Map<Square, Move>();
    for (const m of game.moves({ square: selected, verbose: true }) as Move[]) {
      // Prefer queen promotion when several promotions share a target.
      if (!map.has(m.to as Square) || m.promotion === "q") {
        map.set(m.to as Square, m);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fen]);

  const onSquare = (square: Square) => {
    if (result || turn !== "w") return;
    const piece = game.get(square);

    if (selected && targets.has(square)) {
      const mv = targets.get(square)!;
      game.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? "q" });
      setLast({ from: mv.from as Square, to: mv.to as Square });
      setSelected(null);
      setFen(game.fen());
      settle();
      return;
    }

    if (piece && piece.color === "w") {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  };

  // AI plays black.
  useEffect(() => {
    if (turn !== "b" || result) return;
    const t = setTimeout(() => {
      const mv = chooseMove(game.fen(), 2);
      if (mv) {
        game.move(mv);
        setLast({ from: mv.from as Square, to: mv.to as Square });
        setFen(game.fen());
        settle();
      }
    }, 500);
    return () => clearTimeout(t);
  }, [turn, fen, result, settle, game]);

  // Clocks.
  useEffect(() => {
    if (result) return;
    const id = setInterval(() => {
      if (turn === "w") {
        setWTime((t) => {
          if (t <= 1) {
            setResult("lose");
            return 0;
          }
          return t - 1;
        });
      } else {
        setBTime((t) => {
          if (t <= 1) {
            setResult("win");
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [turn, result]);

  const board = game.board();
  const inCheck = game.inCheck();
  const checkedKing = turn; // side to move is the one in check

  return (
    <MatchShell
      title="Chess"
      status={
        result
          ? "Game over"
          : inCheck
          ? "Check"
          : turn === "w"
          ? "Your move"
          : "Opponent is thinking"
      }
      players={[
        {
          name: "You",
          mark: "♚",
          active: turn === "w" && !result,
          accent: "text-violet-bright",
          clock: fmt(wTime),
        },
        {
          name: "Gambit AI",
          mark: "♛",
          active: turn === "b" && !result,
          accent: "text-teal",
          clock: fmt(bTime),
        },
      ]}
    >
      <div className="relative">
        <div className="grid grid-cols-8 overflow-hidden rounded-2xl border border-white/10 shadow-card">
          {board.map((row, r) =>
            row.map((piece, f) => {
              const square = (FILES[f] + (8 - r)) as Square;
              const lightSq = (r + f) % 2 === 0;
              const isSel = selected === square;
              const isTarget = targets.has(square);
              const isLast = last && (last.from === square || last.to === square);
              const isCheckSq =
                inCheck &&
                piece?.type === "k" &&
                piece.color === checkedKing;

              return (
                <button
                  key={square}
                  onClick={() => onSquare(square)}
                  className={cn(
                    "relative grid aspect-square place-items-center",
                    lightSq ? "bg-[#23233a]" : "bg-[#15152552]",
                    isLast && "bg-violet/20",
                    isSel && "bg-violet/30",
                    isCheckSq && "bg-rose/30"
                  )}
                >
                  {isTarget && !piece && (
                    <span className="absolute h-2.5 w-2.5 rounded-full bg-teal/70" />
                  )}
                  {isTarget && piece && (
                    <span className="absolute inset-1 rounded-md ring-2 ring-teal/70" />
                  )}
                  {piece && (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={cn(
                        "select-none text-[7vw] leading-none sm:text-3xl",
                        piece.color === "w"
                          ? "text-ink [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
                          : "text-[#0b0b14] [text-shadow:0_1px_1px_rgba(255,255,255,0.15)]"
                      )}
                    >
                      {GLYPH[piece.type]}
                    </motion.span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <ResultOverlay result={result} onRematch={reset} />
      </div>
    </MatchShell>
  );
}
