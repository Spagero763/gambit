"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";

/**
 * A soft emerald light that follows the pointer across the whole page —
 * the backdrop feels alive and responsive without ever shouting.
 */
export function Spotlight() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 20 });
  const sy = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    // start centred so the first paint isn't pinned to a corner
    x.set(window.innerWidth / 2);
    y.set(window.innerHeight * 0.3);
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);

  const bg = useMotionTemplate`radial-gradient(560px circle at ${sx}px ${sy}px, rgba(62,207,142,0.075), transparent 70%)`;

  if (reduce) return null;
  return <motion.div aria-hidden className="absolute inset-0" style={{ background: bg }} />;
}
