"use client";

import { motion } from "framer-motion";

const CELL = 56;
const OX = (320 - CELL * 3) / 2;
const OY = (220 - CELL * 3) / 2;
const X = "#c7c2ff";
const O = "#3ecf8e";

function center(r: number, c: number) {
  return { x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2 };
}

function XMark({ r, c, delay }: { r: number; c: number; delay: number }) {
  const { x, y } = center(r, c);
  const d = 15;
  const t = { duration: 0.26, ease: "easeOut", delay } as const;
  return (
    <g stroke={X} strokeWidth="8" strokeLinecap="round">
      <motion.line x1={x - d} y1={y - d} x2={x + d} y2={y + d} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={t} />
      <motion.line x1={x + d} y1={y - d} x2={x - d} y2={y + d} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...t, delay: delay + 0.16 }} />
    </g>
  );
}

function OMark({ r, c, delay }: { r: number; c: number; delay: number }) {
  const { x, y } = center(r, c);
  return (
    <motion.circle
      cx={x}
      cy={y}
      r="17"
      fill="none"
      stroke={O}
      strokeWidth="8"
      strokeLinecap="round"
      initial={{ pathLength: 0, rotate: -90 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  );
}

/** X builds the middle column to a win. */
export function XOScene() {
  const top = center(0, 1);
  const bot = center(2, 1);
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full">
      {/* grid */}
      <g stroke="rgba(255,255,255,0.16)" strokeWidth="3" strokeLinecap="round">
        <line x1={OX + CELL} y1={OY} x2={OX + CELL} y2={OY + CELL * 3} />
        <line x1={OX + CELL * 2} y1={OY} x2={OX + CELL * 2} y2={OY + CELL * 3} />
        <line x1={OX} y1={OY + CELL} x2={OX + CELL * 3} y2={OY + CELL} />
        <line x1={OX} y1={OY + CELL * 2} x2={OX + CELL * 3} y2={OY + CELL * 2} />
      </g>

      <XMark r={1} c={1} delay={0.2} />
      <OMark r={0} c={0} delay={0.7} />
      <XMark r={0} c={1} delay={1.15} />
      <OMark r={2} c={2} delay={1.65} />
      <XMark r={2} c={1} delay={2.1} />

      {/* winning line */}
      <motion.line
        x1={top.x}
        y1={top.y}
        x2={bot.x}
        y2={bot.y}
        stroke="#f6d66b"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 2.7 }}
      />
    </svg>
  );
}
