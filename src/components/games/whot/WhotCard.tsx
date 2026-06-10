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

/** A full Whot card face — real card anatomy: vertical corner indices (number
 *  with the suit beneath it, mirrored bottom-right), a double frame, and a big
 *  centre suit with depth. Key info stays legible in a fanned hand. */
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
        "relative h-full w-full select-none overflow-hidden rounded-xl border",
        dim ? "border-black/10 opacity-80" : "border-black/20",
        className
      )}
      style={{
        background: "linear-gradient(160deg, #fbf8f0 0%, #f3eee0 70%, #ece5d2 100%)",
        boxShadow: dim
          ? "none"
          : "inset 0 1px 1px rgba(255,255,255,0.9), 0 6px 14px -6px rgba(0,0,0,0.6)",
      }}
    >
      {/* inner frame in the suit colour */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[5%] rounded-[8px] border"
        style={{ borderColor: `${color}55` }}
      />

      {/* top-left vertical index: number over suit, like a real deck */}
      <div className="absolute left-[7%] top-[5%] flex flex-col items-center leading-none">
        <span className="font-display text-[0.95em] text-sm font-extrabold" style={{ color: isWhot ? "#7a1f3d" : color }}>
          {isWhot ? "W" : num}
        </span>
        {!isWhot && <WhotShape shape={shape} size={11} className="mt-[2px]" />}
      </div>

      {/* bottom-right vertical index, rotated 180° */}
      <div className="absolute bottom-[5%] right-[7%] flex rotate-180 flex-col items-center leading-none">
        <span className="font-display text-sm font-extrabold" style={{ color: isWhot ? "#7a1f3d" : color }}>
          {isWhot ? "W" : num}
        </span>
        {!isWhot && <WhotShape shape={shape} size={11} className="mt-[2px]" />}
      </div>

      {/* centre */}
      <div className="absolute inset-0 grid place-items-center">
        {isWhot ? (
          <div className="-rotate-12 text-center">
            <p
              className="font-display text-base font-black italic tracking-tight"
              style={{ color: "#7a1f3d", textShadow: "0 1px 0 rgba(255,255,255,0.7)" }}
            >
              WHOT!
            </p>
            <p className="text-[8px] font-bold" style={{ color: "#7a1f3d99" }}>20</p>
          </div>
        ) : (
          <span style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.25))" }}>
            <WhotShape shape={shape} size={34} />
          </span>
        )}
      </div>
    </div>
  );
}

/** Card back — the classic Whot look: deep crimson, double ring, tilted oval. */
export function WhotCardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-xl border border-black/30", className)}
      style={{
        background: "linear-gradient(155deg, #8c2347 0%, #6d1a38 55%, #4a1226 100%)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.18)",
      }}
    >
      {/* double frame */}
      <span className="pointer-events-none absolute inset-[5%] rounded-[8px] border border-white/25" />
      <span className="pointer-events-none absolute inset-[10%] rounded-[6px] border border-white/12" />
      {/* tilted oval wordmark — crisp at any size via SVG */}
      <svg viewBox="0 0 60 84" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g transform="rotate(-18 30 42)">
          <ellipse cx="30" cy="42" rx="21" ry="12.5" fill="#fdf6ec" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <ellipse cx="30" cy="42" rx="18.5" ry="10.2" fill="none" stroke="#8c2347" strokeWidth="0.9" />
          <text
            x="30"
            y="45.2"
            textAnchor="middle"
            fontSize="9.5"
            fontStyle="italic"
            fontWeight="900"
            fill="#7a1f3d"
            style={{ letterSpacing: "0.5px" }}
          >
            WHOT!
          </text>
        </g>
        {/* corner pips */}
        <circle cx="8" cy="10" r="1.4" fill="rgba(255,255,255,0.35)" />
        <circle cx="52" cy="74" r="1.4" fill="rgba(255,255,255,0.35)" />
      </svg>
    </div>
  );
}

export { SHAPE_COLOR };
