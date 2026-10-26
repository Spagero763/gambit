"use client";

import { Shape } from "@/lib/games/whot";
import { cn } from "@/lib/cn";

// The classic Nigerian deck: every suit printed in one crimson on cream.
const CRIMSON = "#a3162e";
const SHAPE_COLOR: Record<Shape, string> = {
  circle: CRIMSON,
  triangle: CRIMSON,
  cross: CRIMSON,
  square: CRIMSON,
  star: CRIMSON,
  whot: CRIMSON,
};

export function WhotShape({
  shape,
  size = 24,
  color,
  className,
}: {
  shape: Shape;
  size?: number;
  color?: string;
  className?: string;
}) {
  const c = color ?? SHAPE_COLOR[shape];
  const r = 9;
  let node: JSX.Element;
  switch (shape) {
    case "circle":
      node = <circle cx="12" cy="12" r={r} />;
      break;
    case "triangle":
      node = <path d={`M12 ${12 - r} L ${12 + r} ${12 + r * 0.8} L ${12 - r} ${12 + r * 0.8} Z`} />;
      break;
    case "cross":
      node = (
        <path
          d={`M ${12 - r * 0.34} ${12 - r} h ${r * 0.68} v ${r * 0.66} h ${r * 0.66} v ${r * 0.68} h ${-r * 0.66} v ${r * 0.66} h ${-r * 0.68} v ${-r * 0.66} h ${-r * 0.66} v ${-r * 0.68} h ${r * 0.66} Z`}
        />
      );
      break;
    case "square":
      node = <rect x={12 - r * 0.85} y={12 - r * 0.85} width={r * 1.7} height={r * 1.7} rx="1.2" />;
      break;
    case "star":
      node = <Star cx={12} cy={12} r={r} />;
      break;
    default:
      node = (
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill={c}>
          W
        </text>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill={c} aria-hidden>
      {node}
    </svg>
  );
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`);
  }
  return <polygon points={pts.join(" ")} />;
}

/** A card face laid out like the printed deck: corner number and suit,
 *  mirrored in the opposite corner, one big suit in the middle. */
export function WhotCardFace({
  shape,
  num,
  className,
  dim,
}: {
  shape: Shape;
  num: number;
  className?: string;
  dim?: boolean;
}) {
  const isWhot = shape === "whot";
  const index = (
    <>
      <span className="display text-[15px] font-extrabold leading-none" style={{ color: CRIMSON }}>
        {isWhot ? 20 : num}
      </span>
      {!isWhot && <WhotShape shape={shape} size={10} className="mt-[3px]" />}
    </>
  );

  return (
    <div
      className={cn(
        "relative h-full w-full select-none overflow-hidden rounded-[10px] bg-whot-cream",
        dim && "opacity-60",
        className
      )}
      style={{ boxShadow: "inset 0 0 0 1px rgba(110,15,32,0.18), 0 8px 18px -10px rgba(0,0,0,0.75)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[6%] rounded-[6px]"
        style={{ boxShadow: `inset 0 0 0 1px ${CRIMSON}33` }}
      />
      <div className="absolute left-[9%] top-[6%] flex flex-col items-center">{index}</div>
      <div className="absolute bottom-[6%] right-[9%] flex rotate-180 flex-col items-center">{index}</div>
      <div className="absolute inset-0 grid place-items-center">
        {isWhot ? (
          <span className="display -rotate-[14deg] text-[17px] font-extrabold italic tracking-tight" style={{ color: CRIMSON }}>
            WHOT
          </span>
        ) : (
          <WhotShape shape={shape} size={36} />
        )}
      </div>
    </div>
  );
}

/** The crimson back with the tilted WHOT oval. */
export function WhotCardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-[10px] bg-whot-red", className)}
      style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3), 0 8px 18px -10px rgba(0,0,0,0.75)" }}
    >
      <span className="pointer-events-none absolute inset-[6%] rounded-[6px] border border-white/25" />
      <svg viewBox="0 0 60 84" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g transform="rotate(-18 30 42)">
          <ellipse cx="30" cy="42" rx="20" ry="12" fill="#f6efe1" />
          <ellipse cx="30" cy="42" rx="17.5" ry="9.8" fill="none" stroke={CRIMSON} strokeWidth="0.8" />
          <text x="30" y="45.4" textAnchor="middle" fontSize="9.5" fontStyle="italic" fontWeight="900" fill={CRIMSON}>
            WHOT
          </text>
        </g>
      </svg>
    </div>
  );
}

export { SHAPE_COLOR };
