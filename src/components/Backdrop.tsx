import { CSSProperties } from "react";
import { suitPath, SuitName } from "@/components/ui/Suit";

const GLYPHS: { s: SuitName; x: string; y: string; size: number; r: number; dur: number; delay: number }[] = [
  { s: "triangle", x: "8%", y: "34%", size: 44, r: -12, dur: 17, delay: 0 },
  { s: "circle", x: "86%", y: "26%", size: 34, r: 0, dur: 21, delay: -4 },
  { s: "cross", x: "88%", y: "58%", size: 40, r: 18, dur: 19, delay: -9 },
  { s: "star", x: "5%", y: "66%", size: 38, r: -20, dur: 23, delay: -2 },
  { s: "square", x: "74%", y: "84%", size: 30, r: 12, dur: 18, delay: -11 },
  { s: "circle", x: "20%", y: "90%", size: 26, r: 0, dur: 25, delay: -6 },
];

// Static film of grain so flat dark areas read as a surface, not a void.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The room the games sit in: pools of light drifting slowly over a night
 * table, with the five Whot suits floating past. Pure CSS transforms, so it
 * runs on the compositor and freezes for anyone who asks for less motion.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "linear-gradient(180deg,#081019 0%,#05070c 55%,#05070c 100%)" }}>
      <div
        className="anim-bg absolute -left-[30vw] -top-[25vh] h-[90vh] w-[110vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(62,224,155,0.30), rgba(62,224,155,0) 70%)", animation: "drift-a 26s ease-in-out infinite" }}
      />
      <div
        className="anim-bg absolute -right-[35vw] top-[20vh] h-[80vh] w-[100vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(84,110,255,0.24), rgba(84,110,255,0) 70%)", animation: "drift-b 34s ease-in-out infinite" }}
      />
      <div
        className="anim-bg absolute -bottom-[30vh] left-[10vw] h-[70vh] w-[90vw] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(163,22,46,0.22), rgba(163,22,46,0) 70%)", animation: "drift-a 40s ease-in-out infinite reverse" }}
      />
      {GLYPHS.map((g, i) => (
        <svg
          key={i}
          width={g.size}
          height={g.size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1.4}
          strokeLinejoin="round"
          className="anim-bg absolute"
          style={{ left: g.x, top: g.y, "--r": `${g.r}deg`, animation: `float ${g.dur}s ease-in-out ${g.delay}s infinite` } as CSSProperties}
        >
          {suitPath(g.s)}
        </svg>
      ))}
      <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
