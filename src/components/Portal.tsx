"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children at <body> level via a portal. Use for full-screen overlays
 * (claim reveals, sheets) so `position: fixed` centers on the real viewport —
 * a transformed ancestor (any framer-motion wrapper applies `transform`) would
 * otherwise trap a fixed child and push it off-screen, forcing a scroll.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
