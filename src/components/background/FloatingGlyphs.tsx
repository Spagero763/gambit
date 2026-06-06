"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/** Sleek ambient motion: drifting colour orbs + game motifs that gently react
 *  to the pointer (parallax). On-brand and alive, but never neon-soup. */
type Motif = "circle" | "triangle" | "square" | "cross" | "star" | "x" | "o" | "dice" | "crown";

const GLYPHS: { m: Motif; x: number; y: number; size: number; dur: number; rot: number; o: number; teal?: boolean; violet?: boolean; blur?: boolean }[] = [
  { m: "crown", x: 6, y: 14, size: 78, dur: 30, rot: -14, o: 0.1, blur: true },
  { m: "star", x: 84, y: 9, size: 56, dur: 26, rot: 18, o: 0.13, teal: true },
  { m: "triangle", x: 15, y: 62, size: 64, dur: 34, rot: 10, o: 0.09 },
  { m: "circle", x: 90, y: 44, size: 52, dur: 28, rot: -8, o: 0.1, violet: true },
  { m: "x", x: 71, y: 76, size: 60, dur: 32, rot: 14, o: 0.11, blur: true },
  { m: "dice", x: 9, y: 86, size: 56, dur: 24, rot: -10, o: 0.12 },
  { m: "cross", x: 49, y: 24, size: 48, dur: 30, rot: 20, o: 0.08, blur: true },
  { m: "square", x: 36, y: 82, size: 50, dur: 27, rot: -16, o: 0.09, violet: true },
  { m: "o", x: 92, y: 80, size: 54, dur: 31, rot: 8, o: 0.12, teal: true },
  { m: "star", x: 27, y: 36, size: 40, dur: 25, rot: -12, o: 0.07, blur: true },
  { m: "circle", x: 60, y: 56, size: 34, dur: 29, rot: 6, o: 0.07, blur: true },
  { m: "triangle", x: 78, y: 30, size: 38, dur: 33, rot: -20, o: 0.08, teal: true },
  { m: "x", x: 20, y: 8, size: 36, dur: 26, rot: 12, o: 0.07 },
  { m: "dice", x: 56, y: 90, size: 38, dur: 28, rot: 16, o: 0.08, blur: true },
];

function Shape({ m }: { m: Motif }) {
  const c = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (m) {
    case "circle":
      return <circle cx="12" cy="12" r="8.5" {...c} />;
    case "o":
      return <circle cx="12" cy="12" r="7" {...c} strokeWidth={2} />;
    case "triangle":
      return <path d="M12 4 L20 19 L4 19 Z" {...c} />;
    case "square":
      return <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" {...c} />;
    case "cross":
      return <path d="M9.5 4 h5 v5.5 h5.5 v5 h-5.5 v5.5 h-5 v-5.5 H4 v-5 h5.5 Z" {...c} />;
    case "star":
      return <path d="M12 3 l2.6 5.7 6.2 .7 -4.6 4.2 1.2 6.1 -5.4-3 -5.4 3 1.2-6.1 -4.6-4.2 6.2-.7 Z" {...c} />;
    case "x":
      return (
        <g {...c} strokeWidth={2.2}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </g>
      );
    case "dice":
      return (
        <g {...c}>
          <rect x="4" y="4" width="16" height="16" rx="3.5" />
          <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </g>
      );
    case "crown":
      return <path d="M4 18 h16 l-1.4-8 -3.6 3.4 -3-6.4 -3 6.4 -3.6-3.4 Z" {...c} />;
  }
}

export function FloatingGlyphs() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 22 });
  const sy = useSpring(my, { stiffness: 40, damping: 22 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  const orbX = useTransform(sx, (v) => v * 30);
  const orbY = useTransform(sy, (v) => v * 30);
  const glyphX = useTransform(sx, (v) => v * 55);
  const glyphY = useTransform(sy, (v) => v * 55);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* drifting colour orbs (with pointer parallax) */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { x: orbX, y: orbY }}>
        <motion.div
          aria-hidden
          className="absolute -left-32 top-[-14%] h-[560px] w-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(62,207,142,0.13), transparent 62%)" }}
          animate={reduce ? undefined : { x: [0, 70, -30, 0], y: [0, 50, -40, 0], scale: [1, 1.12, 0.95, 1] }}
          transition={reduce ? undefined : { duration: 34, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute right-[-18%] top-1/4 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(142,139,240,0.12), transparent 62%)" }}
          animate={reduce ? undefined : { x: [0, -60, 35, 0], y: [0, -40, 50, 0], scale: [1, 0.92, 1.1, 1] }}
          transition={reduce ? undefined : { duration: 40, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-[-16%] left-1/3 h-[420px] w-[420px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(227,179,65,0.08), transparent 62%)" }}
          animate={reduce ? undefined : { x: [0, 40, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={reduce ? undefined : { duration: 46, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* floating game motifs (stronger parallax for depth) */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { x: glyphX, y: glyphY }}>
        {GLYPHS.map((g, i) => (
          <motion.div
            key={i}
            aria-hidden
            className={cnTint(g)}
            style={{ left: `${g.x}%`, top: `${g.y}%`, opacity: g.o, filter: g.blur ? "blur(1px)" : undefined }}
            initial={false}
            animate={reduce ? { rotate: g.rot } : { y: [0, -26, 0], rotate: [g.rot, g.rot + 10, g.rot] }}
            transition={reduce ? undefined : { duration: g.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          >
            <svg width={g.size} height={g.size} viewBox="0 0 24 24">
              <Shape m={g.m} />
            </svg>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function cnTint(g: { teal?: boolean; violet?: boolean }) {
  return `absolute ${g.teal ? "text-teal" : g.violet ? "text-violet" : "text-ink"}`;
}
