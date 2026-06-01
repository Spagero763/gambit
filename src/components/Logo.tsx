"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.span
        initial={{ rotate: -12, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-deep to-teal-deep text-lg font-bold text-white shadow-glow"
      >
        ♟
      </motion.span>
      <span className="font-display text-xl font-bold tracking-tight">
        Gambit
      </span>
    </div>
  );
}
