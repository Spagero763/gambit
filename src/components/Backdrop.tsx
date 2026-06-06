import { FloatingGlyphs } from "./background/FloatingGlyphs";

/**
 * Ambient backdrop: a solid near-black base, a faint top wash, slow-drifting
 * colour glows, and game motifs floating gently behind the content. Sleek and
 * on-brand — a world away from the old neon aurora. Sits behind all content.
 */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-void">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 0%, rgba(62,207,142,0.06), transparent 70%)",
        }}
      />
      <FloatingGlyphs />
      {/* gentle vignette to settle the edges */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(4,4,8,0.5))" }}
      />
    </div>
  );
}
