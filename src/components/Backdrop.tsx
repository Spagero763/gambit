"use client";

import { FloatingGlyphs } from "./background/FloatingGlyphs";
import { Spotlight } from "./background/Spotlight";
import { useRichMotion } from "@/lib/useRichMotion";

/**
 * Ambient backdrop, performance-first:
 *  - a static near-black base + top wash + vignette (free),
 *  - three drifting colour glows via pure-CSS transforms (GPU, off the main
 *    thread) — cheap enough to run on any phone,
 *  - and ONLY on capable desktops, the floating game glyphs + pointer
 *    spotlight (the bits that were causing jank on weak devices).
 */
export function Backdrop() {
  const rich = useRichMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-void">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "radial-gradient(80% 100% at 50% 0%, rgba(62,207,142,0.06), transparent 70%)" }}
      />

      {/* drifting glows — CSS-animated, cheap, everywhere */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <span
          className="anim-bg absolute -left-[20%] top-[-14%] h-[60vmin] w-[60vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(62,207,142,0.13), transparent 62%)", animation: "orb-a 34s ease-in-out infinite" }}
        />
        <span
          className="anim-bg absolute right-[-18%] top-[18%] h-[55vmin] w-[55vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(142,139,240,0.12), transparent 62%)", animation: "orb-b 42s ease-in-out infinite" }}
        />
        <span
          className="anim-bg absolute bottom-[-16%] left-[28%] h-[48vmin] w-[48vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(227,179,65,0.08), transparent 62%)", animation: "orb-c 48s ease-in-out infinite" }}
        />
      </div>

      {rich && <FloatingGlyphs />}
      {rich && <Spotlight />}

      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(4,4,8,0.5))" }}
      />
    </div>
  );
}
