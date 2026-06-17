"use client";

import { useEffect, useState } from "react";

/**
 * Should we run the *expensive* ambient motion (floating glyphs, pointer
 * spotlight)? Only on capable desktops: a fine pointer (mouse), enough CPU
 * cores, and no reduced-motion preference. Phones and low-end devices get the
 * cheap CSS-only glow instead, so nothing ever janks. SSR-safe (false first).
 */
export function useRichMotion(): boolean {
  const [rich, setRich] = useState(false);
  useEffect(() => {
    try {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finePointer = window.matchMedia("(pointer: fine)").matches;
      const cores = navigator.hardwareConcurrency ?? 4;
      const mem = (navigator as any).deviceMemory ?? 4; // GB, where supported
      setRich(!reduce && finePointer && cores >= 4 && mem >= 4);
    } catch {
      setRich(false);
    }
  }, []);
  return rich;
}
