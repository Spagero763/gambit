"use client";

import { motion } from "framer-motion";

/**
 * Aurora: large, heavily-blurred colour fields that drift and breathe behind
 * the content, plus a slowly drifting fine grid and a top spotlight.
 */
export function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* drifting fine grid */}
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,125,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,125,255,0.5) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
        animate={{ backgroundPositionY: [0, 46] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* top spotlight */}
      <div className="absolute left-1/2 top-[-10%] h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,125,255,0.18),transparent_60%)] blur-2xl" />

      {/* aurora blobs */}
      <motion.div
        aria-hidden
        className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-violet/30 mix-blend-screen blur-[120px]"
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute right-[-15%] top-1/4 h-96 w-96 rounded-full bg-teal/25 mix-blend-screen blur-[130px]"
        animate={{ x: [0, -40, 30, 0], y: [0, 40, -25, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-10%] left-1/3 h-80 w-80 rounded-full bg-rose/15 mix-blend-screen blur-[120px]"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(4,4,9,0.7))]" />
    </div>
  );
}
