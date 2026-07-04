"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";

/**
 * App Router re-mounts this template on every navigation, so it doubles as a
 * page-enter transition: a quick rise and settle, like the next screen is
 * dealt in. Transform and opacity only (no page-wide blur, which janks on weak
 * GPUs), and fully skipped for reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.994 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease }}
    >
      {children}
    </motion.div>
  );
}
