"use client";

import { motion } from "framer-motion";

/** X and O that draw their strokes in. */
export function Mark({ kind, color }: { kind: "X" | "O"; color?: string }) {
  if (kind === "X") {
    const c = color ?? "#5aa9ff";
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full p-4" style={{ filter: `drop-shadow(0 0 7px ${c}aa)` }} aria-label="X">
        <motion.line x1="24" y1="24" x2="76" y2="76" stroke={c} strokeWidth="11" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.16, ease: "easeOut" }} />
        <motion.line x1="76" y1="24" x2="24" y2="76" stroke={c} strokeWidth="11" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.16, ease: "easeOut", delay: 0.12 }} />
      </svg>
    );
  }
  const c = color ?? "#ffb547";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-4" style={{ filter: `drop-shadow(0 0 7px ${c}aa)` }} aria-label="O">
      <motion.circle
        cx="50"
        cy="50"
        r="27"
        fill="none"
        stroke={c}
        strokeWidth="11"
        strokeLinecap="round"
        initial={{ pathLength: 0, rotate: -90 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}
