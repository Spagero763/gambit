"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mark } from "./Mark";

type Cell = "X" | "O" | null;

const center = (i: number) => ({ x: (i % 3) * 100 + 50, y: Math.floor(i / 3) * 100 + 50 });

export function XOBoard({
  board,
  onCell,
  canPlay,
  colorOf,
  winLine,
  children,
}: {
  board: Cell[];
  onCell: (i: number) => void;
  canPlay: (i: number) => boolean;
  colorOf?: (c: "X" | "O") => string;
  winLine?: number[] | null;
  children?: ReactNode;
}) {
  const a = winLine ? center(winLine[0]) : null;
  const b = winLine ? center(winLine[winLine.length - 1]) : null;

  return (
    <div
      className="relative aspect-square w-full rounded-tile border border-white/10 p-3"
      style={{
        background: "radial-gradient(90% 80% at 50% 38%, #17243d 0%, #0b1220 60%, #070b14 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 30px 60px -30px rgba(0,0,0,0.9)",
      }}
    >
      <div data-coach="grid" className="relative grid h-full w-full grid-cols-3 grid-rows-3">
        <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 0 5px rgba(140,190,255,0.6))" }} aria-hidden>
          <path d="M100 10V290M200 10V290M10 100H290M10 200H290" stroke="rgba(190,215,255,0.5)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => onCell(i)}
            disabled={!canPlay(i)}
            aria-label={cell ? `${cell} in square ${i + 1}` : `Square ${i + 1}`}
            className="relative"
          >
            <span className="pointer-events-none block h-full w-full">
              <AnimatePresence>{cell && <Mark key={cell} kind={cell} color={colorOf?.(cell)} />}</AnimatePresence>
            </span>
          </button>
        ))}
        {a && b && (
          <svg viewBox="0 0 300 300" className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.7))" }} aria-hidden>
            <motion.line
              x1={a.x - (b.x - a.x) * 0.2}
              y1={a.y - (b.y - a.y) * 0.2}
              x2={b.x + (b.x - a.x) * 0.2}
              y2={b.y + (b.y - a.y) * 0.2}
              stroke="#f2f5f8"
              strokeWidth="7"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.36, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
            />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}
