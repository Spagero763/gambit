"use client";

import { motion } from "framer-motion";

const STONES = [
  { x: 70, y: 178 },
  { x: 130, y: 178 },
  { x: 190, y: 178 },
  { x: 250, y: 178 },
];
const TOP = { x: 250, y: 64 };

const MEEPLE_PATH =
  "M50 5C40 5 33 13 33 22C33 28 36 33 41 36C30 39 22 47 17 58C15 62 17 67 22 67L36 67C36 67 33 75 33 82C33 90 40 95 50 95C60 95 67 90 67 82C67 75 64 67 64 67L78 67C83 67 85 62 83 58C78 47 70 39 59 36C64 33 67 28 67 22C67 13 60 5 50 5Z";

/** A token hops across stones then climbs a ladder to the flag; a die rolls. */
export function SnakesScene() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full">
      {/* stones */}
      {STONES.map((s, i) => (
        <g key={i}>
          <ellipse cx={s.x} cy={s.y + 14} rx="22" ry="6" fill="rgba(0,0,0,0.35)" />
          <rect x={s.x - 24} y={s.y} width="48" height="16" rx="8" fill={i % 2 ? "#33291a" : "#3d3120"} stroke="rgba(227,179,65,0.25)" />
        </g>
      ))}

      {/* ladder */}
      <g stroke="#46c08a" strokeWidth="3.5" strokeLinecap="round">
        <line x1={244} y1={178} x2={244} y2={64} />
        <line x1={258} y1={178} x2={258} y2={64} />
        {Array.from({ length: 6 }).map((_, t) => {
          const y = 178 - (t + 1) * ((178 - 64) / 7);
          return <line key={t} x1={244} y1={y} x2={258} y2={y} />;
        })}
      </g>

      {/* flag on top platform */}
      <rect x={TOP.x - 26} y={TOP.y + 2} width="52" height="14" rx="7" fill="#3d3120" stroke="rgba(227,179,65,0.25)" />
      <line x1={TOP.x} y1={TOP.y + 2} x2={TOP.x} y2={TOP.y - 22} stroke="#cfc7b6" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${TOP.x} ${TOP.y - 22} l 18 6 l -18 6 Z`} fill="#e06c8b" />

      {/* die, rolling then settling on five */}
      <motion.g
        initial={{ rotate: -30 }}
        animate={{ rotate: [-30, 25, -12, 0] }}
        transition={{ duration: 0.7, times: [0, 0.4, 0.75, 1], ease: "easeOut" }}
        style={{ transformOrigin: "58px 60px" }}
      >
        <rect x={42} y={44} width={32} height={32} rx="7" fill="#f4f4f5" />
        {[
          [49, 51],
          [67, 51],
          [58, 60],
          [49, 69],
          [67, 69],
        ].map(([cx, cy], k) => (
          <circle key={k} cx={cx} cy={cy} r="2.6" fill="#171206" />
        ))}
      </motion.g>

      {/* token */}
      <motion.g
        initial={{ x: STONES[0].x, y: STONES[0].y - 10 }}
        animate={{
          x: [STONES[0].x, STONES[1].x, STONES[2].x, STONES[3].x, STONES[3].x, TOP.x],
          y: [STONES[0].y - 10, STONES[1].y - 10, STONES[2].y - 10, STONES[3].y - 10, STONES[3].y - 10, TOP.y - 10],
        }}
        transition={{ duration: 3.6, times: [0, 0.18, 0.34, 0.5, 0.62, 1], ease: "easeInOut" }}
      >
        <ellipse cx={0} cy={11} rx="9" ry="3" fill="rgba(0,0,0,0.4)" />
        <g transform="translate(-12 -16) scale(0.24)">
          <path d={MEEPLE_PATH} fill="#3ecf8e" stroke="#0a0a0c" strokeWidth={6} strokeLinejoin="round" />
        </g>
      </motion.g>
    </svg>
  );
}
