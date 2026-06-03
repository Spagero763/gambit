"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Original geometric Gambit monogram: a faceted "G" gem on a dark tile. */
export function GambitMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="gm-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#161430" />
          <stop offset="1" stopColor="#0a0918" />
        </linearGradient>
        <linearGradient id="gm-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a89bff" />
          <stop offset="0.55" stopColor="#27e1a6" />
          <stop offset="1" stopColor="#ffc15e" />
        </linearGradient>
      </defs>

      {/* tile */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="url(#gm-tile)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="none" stroke="rgba(255,255,255,0.10)" />

      {/* faceted G: an open hexagonal ring with an inward bar */}
      <g fill="none" stroke="url(#gm-stroke)" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M31 16.5 L24 12.5 L13 18.8 L13 30.2 L24 36.5 L35 30.2 L35 24 L25 24" />
      </g>
      {/* inner gem dot */}
      <circle cx="24" cy="24" r="2.4" fill="#27e1a6" />
      {/* top highlight */}
      <rect x="1.5" y="1.5" width="45" height="20" rx="12" fill="white" opacity="0.04" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.span
        initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="shadow-glow"
        style={{ borderRadius: 12, lineHeight: 0 }}
      >
        <GambitMark size={34} />
      </motion.span>
      <span className="font-display text-xl font-bold tracking-tight">
        Gambit
        <span className="text-teal">.</span>
      </span>
    </div>
  );
}
