"use client";

import { motion } from "framer-motion";

/**
 * Layered ambient backdrop: dot grid, two slow-drifting glow orbs, and a top
 * spotlight. Purely decorative, sits behind all content.
 */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 bg-dots mask-fade-b opacity-70" />
      <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-grid-fade blur-2xl" />

      <motion.div
        aria-hidden
        className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet/30 blur-[120px]"
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-teal/20 blur-[130px]"
        animate={{ x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
