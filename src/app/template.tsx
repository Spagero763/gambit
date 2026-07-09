"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ease } from "@/lib/motion";

/**
 * App Router re-mounts this template on every navigation, so it doubles as a
 * page-enter transition: rise out of a soft blur with a scale settle (the feel
 * the app has always had). Skipped entirely for reduced-motion.
 *
 * Once the animation lands we clear transform/filter to `none`. A non-none
 * transform or filter turns this wrapper into the containing block for every
 * `position: fixed` child (the bottom nav, backdrops, overlays), which would
 * leave them anchored to the scrolling page instead of the screen. Dropping
 * them re-locks the fixed menu to the viewport on mobile.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(false);
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.992, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
      onAnimationComplete={() => setSettled(true)}
      style={settled ? { transform: "none", filter: "none" } : undefined}
    >
      {children}
    </motion.div>
  );
}
