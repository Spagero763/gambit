"use client";

import { motion } from "framer-motion";

/** Hand-drawn style X and O that animate their strokes in. */
export function Mark({ kind }: { kind: "X" | "O" }) {
  if (kind === "X") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full p-4">
        <motion.line
          x1="22" y1="22" x2="78" y2="78"
          stroke="#a89bff" strokeWidth="11" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 6px rgba(139,125,255,0.5))" }}
        />
        <motion.line
          x1="78" y1="22" x2="22" y2="78"
          stroke="#a89bff" strokeWidth="11" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: 0.18 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(139,125,255,0.5))" }}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full p-4">
      <motion.circle
        cx="50" cy="50" r="28"
        fill="none" stroke="#27e1a6" strokeWidth="11" strokeLinecap="round"
        initial={{ pathLength: 0, rotate: -90 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        style={{ transformOrigin: "center", filter: "drop-shadow(0 0 6px rgba(39,225,166,0.5))" }}
      />
    </svg>
  );
}
