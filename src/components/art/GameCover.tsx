import { Game } from "@/lib/games";

const VB = "0 0 320 200";
const SLICE = "xMidYMid slice";

export function GameCover({ art, className }: { art: Game["art"]; className?: string }) {
  switch (art) {
    case "chess":
      return <ChessCover className={className} />;
    case "xo":
      return <XOCover className={className} />;
    case "snakes":
      return <SnakesCover className={className} />;
    case "blocks":
      return <BlocksCover className={className} />;
    case "runner":
      return <RunnerCover className={className} />;
  }
}

/* ---------- isometric helpers ---------- */
function iso(i: number, j: number, cx: number, cy: number, w: number, h: number) {
  return { x: cx + (i - j) * w, y: cy + (i + j) * h };
}

function ChessCover({ className }: { className?: string }) {
  const cx = 160;
  const cy = 36;
  const w = 22;
  const h = 11;
  const N = 6;
  const cells = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = iso(i, j, cx, cy, w, h);
      const b = iso(i + 1, j, cx, cy, w, h);
      const c = iso(i + 1, j + 1, cx, cy, w, h);
      const d = iso(i, j + 1, cx, cy, w, h);
      cells.push(
        <polygon
          key={`${i}-${j}`}
          points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`}
          fill={(i + j) % 2 === 0 ? "#241f4d" : "#15122e"}
          stroke="rgba(168,155,255,0.12)"
          strokeWidth={0.5}
        />
      );
    }
  }
  const k = iso(3, 3, cx, cy, w, h); // king base
  const p = iso(1.4, 4.2, cx, cy, w, h); // pawn base
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <linearGradient id="cbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15132b" />
          <stop offset="1" stopColor="#0a0918" />
        </linearGradient>
        <radialGradient id="cglow" cx="0.5" cy="0.1" r="0.8">
          <stop offset="0" stopColor="rgba(139,125,255,0.45)" />
          <stop offset="1" stopColor="rgba(139,125,255,0)" />
        </radialGradient>
        <linearGradient id="king" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbfaff" />
          <stop offset="0.5" stopColor="#cfc7ff" />
          <stop offset="1" stopColor="#8b7dff" />
        </linearGradient>
        <linearGradient id="pawn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9b0ff" />
          <stop offset="1" stopColor="#5b4ee0" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#cbg)" />
      <rect width="320" height="200" fill="url(#cglow)" />
      {cells}
      {/* pawn */}
      <ellipse cx={p.x} cy={p.y + 2} rx="11" ry="4" fill="rgba(0,0,0,0.45)" />
      <circle cx={p.x} cy={p.y - 18} r="7" fill="url(#pawn)" />
      <path d={`M${p.x - 9},${p.y} Q${p.x},${p.y - 16} ${p.x + 9},${p.y} Z`} fill="url(#pawn)" />
      {/* king */}
      <ellipse cx={k.x} cy={k.y + 3} rx="16" ry="5.5" fill="rgba(0,0,0,0.5)" />
      <path
        d={`M${k.x - 13},${k.y} Q${k.x - 9},${k.y - 30} ${k.x},${k.y - 34} Q${k.x + 9},${k.y - 30} ${k.x + 13},${k.y} Z`}
        fill="url(#king)"
      />
      <ellipse cx={k.x} cy={k.y - 36} rx="9" ry="6" fill="url(#king)" />
      <rect x={k.x - 2} y={k.y - 56} width="4" height="16" rx="1.5" fill="#fbfaff" />
      <rect x={k.x - 6} y={k.y - 50} width="12" height="4" rx="1.5" fill="#fbfaff" />
    </svg>
  );
}

function XOCover({ className }: { className?: string }) {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <linearGradient id="xbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a1c19" />
          <stop offset="1" stopColor="#06120f" />
        </linearGradient>
        <radialGradient id="xglow" cx="0.5" cy="0.2" r="0.9">
          <stop offset="0" stopColor="rgba(39,225,166,0.4)" />
          <stop offset="1" stopColor="rgba(39,225,166,0)" />
        </radialGradient>
        <linearGradient id="xo-x" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7defc4" />
          <stop offset="1" stopColor="#10b886" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#xbg)" />
      <rect width="320" height="200" fill="url(#xglow)" />
      <g transform="translate(160 104) skewX(-12) scale(1 0.86)">
        {/* grid */}
        <g stroke="rgba(39,225,166,0.5)" strokeWidth="4" strokeLinecap="round">
          <line x1="-26" y1="-78" x2="-26" y2="78" />
          <line x1="26" y1="-78" x2="26" y2="78" />
          <line x1="-78" y1="-26" x2="78" y2="-26" />
          <line x1="-78" y1="26" x2="78" y2="26" />
        </g>
        {/* X top-left */}
        <g transform="translate(-52 -52)" stroke="url(#xo-x)" strokeWidth="8" strokeLinecap="round">
          <line x1="-12" y1="-12" x2="12" y2="12" />
          <line x1="12" y1="-12" x2="-12" y2="12" />
        </g>
        {/* O center */}
        <circle cx="0" cy="0" r="14" fill="none" stroke="#e9fff7" strokeWidth="7" />
        {/* X bottom-right */}
        <g transform="translate(52 52)" stroke="url(#xo-x)" strokeWidth="8" strokeLinecap="round">
          <line x1="-12" y1="-12" x2="12" y2="12" />
          <line x1="12" y1="-12" x2="-12" y2="12" />
        </g>
        {/* O bottom-left */}
        <circle cx="-52" cy="52" r="13" fill="none" stroke="#7defc4" strokeWidth="6" opacity="0.7" />
      </g>
    </svg>
  );
}

function SnakesCover({ className }: { className?: string }) {
  const cx = 120;
  const cy = 70;
  const w = 24;
  const h = 12;
  const N = 4;
  const cells = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = iso(i, j, cx, cy, w, h);
      const b = iso(i + 1, j, cx, cy, w, h);
      const c = iso(i + 1, j + 1, cx, cy, w, h);
      const d = iso(i, j + 1, cx, cy, w, h);
      cells.push(
        <polygon
          key={`${i}-${j}`}
          points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`}
          fill={(i + j) % 2 === 0 ? "#3a2c10" : "#241a08"}
          stroke="rgba(255,193,94,0.14)"
          strokeWidth={0.5}
        />
      );
    }
  }
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <linearGradient id="sbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1606" />
          <stop offset="1" stopColor="#0c0a04" />
        </linearGradient>
        <radialGradient id="sglow" cx="0.5" cy="0.15" r="0.9">
          <stop offset="0" stopColor="rgba(255,193,94,0.32)" />
          <stop offset="1" stopColor="rgba(255,193,94,0)" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#sbg)" />
      <rect width="320" height="200" fill="url(#sglow)" />
      {cells}
      {/* ladder */}
      <g stroke="#27e1a6" strokeWidth="3.5" strokeLinecap="round">
        <line x1="150" y1="150" x2="186" y2="58" />
        <line x1="168" y1="154" x2="204" y2="62" />
        {[0, 1, 2, 3, 4].map((t) => (
          <line
            key={t}
            x1={150 + (186 - 150) * (t / 4) + 9}
            y1={150 + (58 - 150) * (t / 4) + 2}
            x2={150 + (186 - 150) * (t / 4) + 18}
            y2={150 + (58 - 150) * (t / 4) - 2}
          />
        ))}
      </g>
      {/* snake */}
      <path
        d="M232 60 Q200 84 236 104 Q272 124 240 150"
        fill="none"
        stroke="#ff6b9a"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="232" cy="58" r="8" fill="#ff6b9a" />
      <circle cx="230" cy="56" r="1.6" fill="#0c0a04" />
      {/* die */}
      <g transform="translate(70 150)">
        <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#f3f1ff" />
        <circle cx="-5" cy="-5" r="2" fill="#1c1606" />
        <circle cx="5" cy="5" r="2" fill="#1c1606" />
        <circle cx="0" cy="0" r="2" fill="#1c1606" />
      </g>
    </svg>
  );
}

function BlocksCover({ className }: { className?: string }) {
  const cube = (x: number, y: number, s: number, top: string, left: string, right: string) => {
    const h = s * 0.5;
    return (
      <g>
        <polygon points={`${x},${y} ${x + s},${y - h} ${x + 2 * s},${y} ${x + s},${y + h}`} fill={top} />
        <polygon points={`${x},${y} ${x + s},${y + h} ${x + s},${y + h + s} ${x},${y + s}`} fill={left} />
        <polygon
          points={`${x + 2 * s},${y} ${x + s},${y + h} ${x + s},${y + h + s} ${x + 2 * s},${y + s}`}
          fill={right}
        />
      </g>
    );
  };
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <linearGradient id="bbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f0c17" />
          <stop offset="1" stopColor="#0d050b" />
        </linearGradient>
        <radialGradient id="bglow" cx="0.5" cy="0.2" r="0.9">
          <stop offset="0" stopColor="rgba(255,107,154,0.35)" />
          <stop offset="1" stopColor="rgba(255,107,154,0)" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#bbg)" />
      <rect width="320" height="200" fill="url(#bglow)" />
      <g transform="translate(96 70)">
        {cube(0, 60, 30, "#5b4ee0", "#3a3196", "#2a2475")}
        {cube(60, 60, 30, "#27e1a6", "#179c72", "#0f6e51")}
        {cube(30, 30, 30, "#ffc15e", "#cf9636", "#9c7026")}
        {cube(30, 90, 30, "#ff6b9a", "#cf4f78", "#9c3a59")}
        {cube(30, 0, 30, "#a89bff", "#7a6fd6", "#5b51a8")}
      </g>
    </svg>
  );
}

function RunnerCover({ className }: { className?: string }) {
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <linearGradient id="rbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1840" />
          <stop offset="0.55" stopColor="#0e0d24" />
          <stop offset="1" stopColor="#070612" />
        </linearGradient>
        <linearGradient id="rfloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#211d52" />
          <stop offset="1" stopColor="#0c0a22" />
        </linearGradient>
        <radialGradient id="rsun" cx="0.5" cy="0.3" r="0.5">
          <stop offset="0" stopColor="rgba(168,155,255,0.6)" />
          <stop offset="1" stopColor="rgba(168,155,255,0)" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#rbg)" />
      <circle cx="160" cy="62" r="60" fill="url(#rsun)" />
      {/* track: trapezoid converging to a vanishing point */}
      <polygon points="160,60 196,60 300,200 20,200" fill="url(#rfloor)" />
      {/* lane lines */}
      <g stroke="rgba(168,155,255,0.5)" strokeWidth="2">
        <line x1="173" y1="60" x2="113" y2="200" />
        <line x1="183" y1="60" x2="207" y2="200" />
      </g>
      {/* rails */}
      <g stroke="rgba(39,225,166,0.45)" strokeWidth="2.5">
        <line x1="166" y1="60" x2="60" y2="200" />
        <line x1="190" y1="60" x2="260" y2="200" />
      </g>
      {/* a train in the right lane, receding */}
      <g>
        <polygon points="196,96 214,92 214,150 196,158" fill="#ff6b9a" />
        <polygon points="214,92 230,96 230,150 214,150" fill="#cf4f78" />
        <rect x="200" y="104" width="9" height="12" rx="1" fill="#2a0e1a" opacity="0.8" />
      </g>
      {/* runner silhouette in foreground */}
      <g transform="translate(120 150)" fill="#0a0814" stroke="#a89bff" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="0" cy="-30" r="7" fill="#a89bff" stroke="none" />
        <path d="M0 -22 L-4 -4 M0 -22 L7 -8" />
        <path d="M-4 -4 L-12 8 M-4 -4 L4 6 L1 22" />
        <path d="M2 -16 L-12 -12 M2 -16 L14 -20" />
      </g>
    </svg>
  );
}
