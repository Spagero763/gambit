"use client";

import { Shape } from "@/lib/games/whot";
import { cn } from "@/lib/cn";

const SHAPE_COLOR: Record<Shape, string> = {
  circle: "#8b7dff",
  triangle: "#27e1a6",
  cross: "#ffc15e",
  square: "#ff6b9a",
  star: "#a89bff",
  whot: "#f3f1ff",
};

/** A single Whot shape glyph. */
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
      node = <rect x={12 - r * 0.85} y={12 - r * 0.85} width={r * 1.7} height={r * 1.7} rx="2" />;
      break;
    case "star":
      node = <Star cx={12} cy={12} r={r} />;
      break;
    default:
      node = (
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="800" fill={c}>
          WHOT
        </text>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill={c}>
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

/** A full Whot card face. Key info anchored top-left + bottom-right for fanned legibility. */
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
  const color = SHAPE_COLOR[shape];

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none flex-col justify-between overflow-hidden rounded-xl border bg-[#f7f4ec] p-1.5",
        dim ? "border-black/10 opacity-80" : "border-black/15",
        className
      )}
      style={{ boxShadow: dim ? "none" : "0 6px 14px -6px rgba(0,0,0,0.6)" }}
    >
      {/* color band */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />

      {/* top-left corner info */}
      <div className="flex items-center gap-1 leading-none">
        <span className="font-display text-sm font-extrabold" style={{ color: isWhot ? "#2b2836" : color }}>
          {isWhot ? "★" : num}
        </span>
        {!isWhot && <WhotShape shape={shape} size={12} />}
      </div>

      {/* center */}
      <div className="grid flex-1 place-items-center">
        {isWhot ? (
          <div className="text-center">
            <p className="font-display text-base font-black tracking-tight text-[#2b2836]">WHOT</p>
            <p className="text-[8px] font-bold text-[#6b6498]">20</p>
          </div>
        ) : (
          <WhotShape shape={shape} size={34} />
        )}
      </div>

      {/* bottom-right corner info (rotated) */}
      <div className="flex items-center justify-end gap-1 leading-none">
        {!isWhot && <WhotShape shape={shape} size={12} />}
        <span className="font-display text-sm font-extrabold" style={{ color: isWhot ? "#2b2836" : color }}>
          {isWhot ? "★" : num}
        </span>
      </div>
    </div>
  );
}

/** Card back for hidden hands and the market pile. */
export function WhotCardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-deep to-[#241f52]",
        className
      )}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-white/10">
          <span className="font-display text-[9px] font-black text-white/90">W</span>
        </div>
      </div>
      <div className="absolute inset-1 rounded-lg border border-white/10" />
    </div>
  );
}

export { SHAPE_COLOR };
