"use client";

import { motion } from "framer-motion";

const N = 6;
const CELL = 28;
const OX = (320 - N * CELL) / 2;
const OY = (220 - N * CELL) / 2;
const GAP = 3;

const cx = (c: number) => OX + c * CELL;
const cy = (r: number) => OY + r * CELL;

function Block({ c, r, color }: { c: number; r: number; color: string }) {
  return (
    <g>
      <rect x={cx(c) + GAP / 2} y={cy(r) + GAP / 2} width={CELL - GAP} height={CELL - GAP} rx="4" fill={color} />
      <rect x={cx(c) + GAP / 2} y={cy(r) + GAP / 2} width={CELL - GAP} height={(CELL - GAP) / 2} rx="4" fill="rgba(255,255,255,0.18)" />
    </g>
  );
}

/** A 1x3 piece drops to complete the bottom row, which flashes and clears. */
export function BlocksScene() {
  const bg: JSX.Element[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      bg.push(<rect key={`${r}-${c}`} x={cx(c) + GAP / 2} y={cy(r) + GAP / 2} width={CELL - GAP} height={CELL - GAP} rx="4" fill="rgba(255,255,255,0.045)" />);
    }
  }

  const pieceOriginX = cx(1) + CELL / 2;
  const pieceOriginY = cy(5) + CELL / 2;

  return (
    <svg viewBox="0 0 320 220" className="h-full w-full">
      <rect x={OX - 7} y={OY - 7} width={N * CELL + 14} height={N * CELL + 14} rx="14" fill="#1a1320" stroke="rgba(255,255,255,0.06)" />
      {bg}

      {/* decorative settled blocks (stay put) */}
      <Block c={0} r={4} color="#5d58c9" />
      <Block c={2} r={4} color="#e3b341" />
      <Block c={3} r={4} color="#e3b341" />
      <Block c={5} r={4} color="#8e8bf0" />
      <Block c={1} r={3} color="#e06c8b" />
      <Block c={4} r={3} color="#3ecf8e" />

      {/* the completed bottom row clears */}
      <motion.g
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 1, 0], scale: [1, 1, 1, 0.5] }}
        transition={{ duration: 2.0, times: [0, 0.6, 0.72, 0.86] }}
        style={{ transformOrigin: `160px ${pieceOriginY}px` }}
      >
        <Block c={3} r={5} color="#5d58c9" />
        <Block c={4} r={5} color="#e06c8b" />
        <Block c={5} r={5} color="#3ecf8e" />
      </motion.g>

      {/* falling 1x3 piece */}
      <motion.g
        initial={{ y: -210, opacity: 1, scale: 1 }}
        animate={{ y: [-210, 0, 0, 0], opacity: [1, 1, 1, 0], scale: [1, 1, 1, 0.5] }}
        transition={{ duration: 2.0, times: [0, 0.45, 0.72, 0.86], ease: [0.5, 0, 0.3, 1.3] }}
        style={{ transformOrigin: `${pieceOriginX}px ${pieceOriginY}px` }}
      >
        <Block c={0} r={5} color="#3ecf8e" />
        <Block c={1} r={5} color="#3ecf8e" />
        <Block c={2} r={5} color="#3ecf8e" />
      </motion.g>

      {/* row-clear flash */}
      <motion.rect
        x={OX}
        y={cy(5)}
        width={N * CELL}
        height={CELL}
        rx="5"
        fill="#ffffff"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.85, 0] }}
        transition={{ duration: 2.0, times: [0, 0.6, 0.72, 0.84] }}
      />
    </svg>
  );
}
