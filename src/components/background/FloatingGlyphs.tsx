"use client";

/**
 * Floating game motifs behind the content. Pure CSS transform animations (no
 * framer RAF loop, no pointer parallax) so they're GPU-composited and don't
 * touch the main thread. Only mounted on capable desktops (see Backdrop), so
 * phones never pay for them.
 */
type Motif = "circle" | "triangle" | "square" | "cross" | "star" | "x" | "o" | "dice" | "crown";

const GLYPHS: { m: Motif; x: number; y: number; size: number; dur: number; rot: number; o: number; teal?: boolean; violet?: boolean }[] = [
  { m: "crown", x: 6, y: 14, size: 78, dur: 17, rot: -14, o: 0.1 },
  { m: "star", x: 84, y: 9, size: 56, dur: 15, rot: 18, o: 0.13, teal: true },
  { m: "triangle", x: 15, y: 62, size: 64, dur: 19, rot: 10, o: 0.09 },
  { m: "circle", x: 90, y: 44, size: 52, dur: 16, rot: -8, o: 0.1, violet: true },
  { m: "x", x: 71, y: 76, size: 60, dur: 18, rot: 14, o: 0.11 },
  { m: "dice", x: 9, y: 86, size: 56, dur: 14, rot: -10, o: 0.12 },
  { m: "o", x: 92, y: 80, size: 54, dur: 17, rot: 8, o: 0.12, teal: true },
  { m: "square", x: 36, y: 82, size: 50, dur: 16, rot: -16, o: 0.09, violet: true },
];

function Shape({ m }: { m: Motif }) {
  const c = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (m) {
    case "circle":
      return <circle cx="12" cy="12" r="8.5" {...c} />;
    case "o":
      return <circle cx="12" cy="12" r="7" {...c} strokeWidth={2} />;
    case "triangle":
      return <path d="M12 4 L20 19 L4 19 Z" {...c} />;
    case "square":
      return <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" {...c} />;
    case "cross":
      return <path d="M9.5 4 h5 v5.5 h5.5 v5 h-5.5 v5.5 h-5 v-5.5 H4 v-5 h5.5 Z" {...c} />;
    case "star":
      return <path d="M12 3 l2.6 5.7 6.2 .7 -4.6 4.2 1.2 6.1 -5.4-3 -5.4 3 1.2-6.1 -4.6-4.2 6.2-.7 Z" {...c} />;
    case "x":
      return (
        <g {...c} strokeWidth={2.2}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </g>
      );
    case "dice":
      return (
        <g {...c}>
          <rect x="4" y="4" width="16" height="16" rx="3.5" />
          <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </g>
      );
    case "crown":
      return <path d="M4 18 h16 l-1.4-8 -3.6 3.4 -3-6.4 -3 6.4 -3.6-3.4 Z" {...c} />;
  }
}

export function FloatingGlyphs() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {GLYPHS.map((g, i) => (
        <div
          key={i}
          aria-hidden
          className={`anim-bg absolute ${g.teal ? "text-teal" : g.violet ? "text-violet" : "text-ink"}`}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            opacity: g.o,
            ["--gr" as any]: `${g.rot}deg`,
            transform: `rotate(${g.rot}deg)`,
            animation: `glyph-float ${g.dur}s ease-in-out ${i * 0.4}s infinite`,
          }}
        >
          <svg width={g.size} height={g.size} viewBox="0 0 24 24">
            <Shape m={g.m} />
          </svg>
        </div>
      ))}
    </div>
  );
}
