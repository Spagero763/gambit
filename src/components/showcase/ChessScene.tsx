"use client";

import { motion } from "framer-motion";
import { ChessGlyph } from "@/components/games/chess/ChessPiece";
import type { PieceSymbol, Color } from "chess.js";

const OX = 60;
const OY = 10;
const S = 40;
const K = S / 45;
const LIGHT = "#eeeed2";
const DARK = "#6f9b55";

function sq(c: number, r: number) {
  return { x: OX + c * S, y: OY + r * S };
}

function Piece({ c, r, type, color }: { c: number; r: number; type: PieceSymbol; color: Color }) {
  const { x, y } = sq(c, r);
  return (
    <g transform={`translate(${x} ${y}) scale(${K})`}>
      <ChessGlyph type={type} color={color} />
    </g>
  );
}

/** White queen slides up the diagonal and captures a black pawn. */
export function ChessScene() {
  const start = sq(1, 3);
  const target = sq(3, 1);

  const cells: JSX.Element[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push(
        <rect key={`${r}-${c}`} x={OX + c * S} y={OY + r * S} width={S} height={S} fill={(r + c) % 2 === 0 ? LIGHT : DARK} />
      );
    }
  }

  return (
    <svg viewBox="0 0 320 220" className="h-full w-full">
      {cells}

      {/* target-square highlight */}
      <motion.rect
        x={target.x}
        y={target.y}
        width={S}
        height={S}
        fill="#f6d66b"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0.55, 0] }}
        transition={{ duration: 2.4, times: [0, 0.3, 0.65, 0.8], ease: "easeInOut" }}
      />

      {/* static black pieces */}
      <Piece c={2} r={0} type="k" color="b" />
      <Piece c={0} r={0} type="r" color="b" />
      <Piece c={1} r={1} type="p" color="b" />
      <Piece c={4} r={1} type="p" color="b" />

      {/* static white pieces */}
      <Piece c={0} r={4} type="r" color="w" />
      <Piece c={2} r={4} type="k" color="w" />
      <Piece c={4} r={4} type="p" color="w" />

      {/* captured black pawn (fades when the queen lands) */}
      <motion.g
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1, 0.4] }}
        transition={{ duration: 2.4, times: [0, 0.62, 0.72] }}
        style={{ transformOrigin: `${target.x + S / 2}px ${target.y + S / 2}px` }}
      >
        <Piece c={3} r={1} type="p" color="b" />
      </motion.g>

      {/* moving white queen */}
      <motion.g
        initial={{ x: start.x, y: start.y }}
        animate={{ x: [start.x, start.x, target.x, target.x], y: [start.y, start.y, target.y, target.y] }}
        transition={{ duration: 2.4, times: [0, 0.3, 0.68, 1], ease: [0.5, 0, 0.2, 1] }}
      >
        <g transform={`scale(${K})`}>
          <ChessGlyph type="q" color="w" />
        </g>
      </motion.g>
    </svg>
  );
}
