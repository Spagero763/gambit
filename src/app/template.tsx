"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";

/**
 * App Router re-mounts this template on every navigation, so it doubles as a
 * page-enter transition: rise out of a soft blur with a scale settle (the feel
 * the app has always had). Skipped entirely for reduced-motion.
 *
 * Note: this wrapper keeps a transform/filter, which makes it the containing
 * block for `position: fixed` children — so anything that must lock to the real
 * viewport (the bottom nav, overlays) is rendered through <Portal> to <body>.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.992, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
    >
      {children}
    </motion.div>
  );
}
