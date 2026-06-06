"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Sleek ambient motion: game motifs (Whot shapes, X/O, dice, crown) drifting
 *  slowly behind the content at very low opacity. On-brand, not distracting. */
type Motif = "circle" | "triangle" | "square" | "cross" | "star" | "x" | "o" | "dice" | "crown";

const GLYPHS: { m: Motif; x: number; y: number; size: number; dur: number; rot: number; o: number; teal?: boolean; blur?: boolean }[] = [
  { m: "crown", x: 6, y: 14, size: 64, dur: 30, rot: -14, o: 0.05, blur: true },
  { m: "star", x: 84, y: 10, size: 46, dur: 26, rot: 18, o: 0.06, teal: true },
  { m: "triangle", x: 16, y: 64, size: 52, dur: 34, rot: 10, o: 0.045 },
  { m: "circle", x: 90, y: 46, size: 40, dur: 28, rot: -8, o: 0.05 },
  { m: "x", x: 70, y: 78, size: 48, dur: 32, rot: 14, o: 0.05, blur: true },
  { m: "dice", x: 10, y: 88, size: 44, dur: 24, rot: -10, o: 0.06 },
  { m: "cross", x: 50, y: 28, size: 38, dur: 30, rot: 20, o: 0.04, blur: true },
  { m: "square", x: 38, y: 84, size: 40, dur: 27, rot: -16, o: 0.045 },
  { m: "o", x: 92, y: 82, size: 42, dur: 31, rot: 8, o: 0.05, teal: true },
  { m: "star", x: 28, y: 38, size: 32, dur: 25, rot: -12, o: 0.04, blur: true },
];

function Shape({ m }: { m: Motif }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (m) {
    case "circle":
      return <circle cx="12" cy="12" r="8.5" {...common} />;
    case "o":
      return <circle cx="12" cy="12" r="7" {...common} strokeWidth={2} />;
    case "triangle":
      return <path d="M12 4 L20 19 L4 19 Z" {...common} />;
    case "square":
      return <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" {...common} />;
    case "cross":
      return <path d="M9.5 4 h5 v5.5 h5.5 v5 h-5.5 v5.5 h-5 v-5.5 H4 v-5 h5.5 Z" {...common} />;
    case "star":
      return <path d="M12 3 l2.6 5.7 6.2 .7 -4.6 4.2 1.2 6.1 -5.4-3 -5.4 3 1.2-6.1 -4.6-4.2 6.2-.7 Z" {...common} />;
    case "x":
      return (
        <g {...common} strokeWidth={2.2}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </g>
      );
    case "dice":
      return (
        <g {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3.5" />
          <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </g>
      );
    case "crown":
      return <path d="M4 18 h16 l-1.4-8 -3.6 3.4 -3-6.4 -3 6.4 -3.6-3.4 Z" {...common} />;
  }
}

export function FloatingGlyphs() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* slow ambient colour drift — far subtler than an aurora */}
      <motion.div
        aria-hidden
        className="absolute -left-32 top-[-12%] h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(62,207,142,0.06), transparent 64%)" }}
        animate={reduce ? undefined : { x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={reduce ? undefined : { duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute right-[-18%] top-1/3 h-[460px] w-[460px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(142,139,240,0.05), transparent 64%)" }}
        animate={reduce ? undefined : { x: [0, -50, 30, 0], y: [0, -30, 40, 0] }}
        transition={reduce ? undefined : { duration: 48, repeat: Infinity, ease: "easeInOut" }}
      />

      {GLYPHS.map((g, i) => (
        <motion.div
          key={i}
          aria-hidden
          className={g.teal ? "absolute text-teal" : "absolute text-ink"}
          style={{ left: `${g.x}%`, top: `${g.y}%`, opacity: g.o, filter: g.blur ? "blur(1px)" : undefined }}
          initial={false}
          animate={reduce ? { rotate: g.rot } : { y: [0, -22, 0], rotate: [g.rot, g.rot + 9, g.rot] }}
          transition={reduce ? undefined : { duration: g.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
        >
          <svg width={g.size} height={g.size} viewBox="0 0 24 24">
            <Shape m={g.m} />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
