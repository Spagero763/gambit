"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Leans toward a mouse pointer like a card picked up off the table. Touch
 * screens get the press instead; a finger has no hover to follow.
 */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 260, damping: 24 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 260, damping: 24 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.14 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const b = ref.current.getBoundingClientRect();
        px.set((e.clientX - b.left) / b.width);
        py.set((e.clientY - b.top) / b.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}
