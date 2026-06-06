"use client";

import { motion } from "framer-motion";

const W = 46;
const H = 64;

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`);
  }
  return <polygon points={pts.join(" ")} />;
}

function CardBack() {
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx="8" fill="#2a2560" stroke="rgba(255,255,255,0.12)" />
      <rect x={-W / 2 + 4} y={-H / 2 + 4} width={W - 8} height={H - 8} rx="6" fill="none" stroke="rgba(255,255,255,0.12)" />
      <circle cx={0} cy={0} r="9" fill="rgba(255,255,255,0.1)" />
      <text x={0} y={4} textAnchor="middle" fontSize="11" fontWeight="800" fill="rgba(255,255,255,0.85)">
        W
      </text>
    </g>
  );
}

function StarFace({ color, num }: { color: string; num: number }) {
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx="8" fill="#f7f4ec" stroke="#cfc7b6" strokeWidth="1.2" />
      <rect x={-W / 2} y={-H / 2} width={W} height={5} rx="2.5" fill={color} />
      <text x={-W / 2 + 6} y={-H / 2 + 17} fontSize="12" fontWeight="800" fill={color}>
        {num}
      </text>
      <g fill={color}>
        <Star cx={0} cy={-2} r={12} />
      </g>
      <g fill={color}>
        <Star cx={W / 2 - 8} cy={H / 2 - 8} r={5} />
      </g>
    </g>
  );
}

/** A face-up card flies from the hand onto the pile. */
export function WhotScene() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full">
      <defs>
        <radialGradient id="whotSceneFelt" cx="0.5" cy="0.4" r="0.85">
          <stop offset="0" stopColor="#1c3a2d" />
          <stop offset="1" stopColor="#0c130f" />
        </radialGradient>
      </defs>
      <rect width="320" height="220" fill="url(#whotSceneFelt)" />

      {/* discard pile */}
      <g transform="translate(150 96) rotate(9)">
        <rect x={-W / 2} y={-H / 2} width={W} height={H} rx="8" fill="#f7f4ec" stroke="#cfc7b6" strokeWidth="1.2" />
        <rect x={-W / 2} y={-H / 2} width={W} height={5} rx="2.5" fill="#3ecf8e" />
        <rect x={-9} y={-9} width={18} height={18} rx="3" fill="#3ecf8e" />
        <text x={-W / 2 + 6} y={-H / 2 + 17} fontSize="12" fontWeight="800" fill="#3ecf8e">
          5
        </text>
      </g>

      {/* hand (card backs) */}
      <g transform="translate(120 200) rotate(-18)">
        <CardBack />
      </g>
      <g transform="translate(200 200) rotate(18)">
        <CardBack />
      </g>

      {/* flying face-up card */}
      <motion.g
        initial={{ x: 160, y: 202, rotate: 2, scale: 0.92 }}
        animate={{ x: [160, 172, 166], y: [202, 84, 92], rotate: [2, -12, -7], scale: [0.92, 1.12, 1.05] }}
        transition={{ duration: 1.15, times: [0, 0.78, 1], ease: [0.3, 0, 0.2, 1], delay: 0.15 }}
      >
        <StarFace color="#8e8bf0" num={8} />
      </motion.g>
    </svg>
  );
}
