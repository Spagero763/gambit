"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#3ecf8e", "#aaa7ff", "#e3b341", "#e06c8b", "#f4f4f5"];

/**
 * Confetti rain. `loop` for ongoing celebrations (podium); default is a
 * one-shot burst (~4s) for win moments. Pure transforms, reduced-motion aware.
 */
export function Confetti({
  loop = false,
  count = 44,
  className,
}: {
  loop?: boolean;
  count?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * 100,
        delay: Math.random() * (loop ? 2.2 : 0.7),
        dur: 2.6 + Math.random() * 2.2,
        size: 6 + Math.random() * 7,
        rot: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.35,
      })),
    [count, loop]
  );

  if (reduce) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-[-6%]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
          }}
          initial={{ y: "-6vh", opacity: 1, rotate: 0 }}
          animate={{ y: "108vh", opacity: [1, 1, 0.9, 0.65], rotate: p.rot }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: loop ? Infinity : 0,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
