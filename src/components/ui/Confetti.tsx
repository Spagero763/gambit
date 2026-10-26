import { CSSProperties } from "react";

const COLORS = ["#3ee09b", "#7bf5c1", "#ffd66b", "#5aa9ff", "#ffb547", "#f6efe1"];

/** One burst, then gone. Each piece only moves and spins. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      {Array.from({ length: pieces }).map((_, i) => {
        const angle = (i / pieces) * Math.PI * 2;
        const dist = 140 + ((i * 37) % 120);
        const style = {
          "--x": `${Math.cos(angle) * dist}px`,
          "--y": `${Math.sin(angle) * dist - 120}px`,
          "--spin": `${(i % 2 ? 1 : -1) * (240 + ((i * 53) % 300))}deg`,
          background: COLORS[i % COLORS.length],
          width: i % 3 ? 8 : 6,
          height: i % 3 ? 12 : 6,
          borderRadius: i % 3 ? 2 : 999,
          animation: `burst 1300ms cubic-bezier(0.2,0.8,0.3,1) ${(i % 6) * 18}ms both`,
        } as CSSProperties;
        return <span key={i} className="absolute left-1/2 top-[38%]" style={style} />;
      })}
    </div>
  );
}
