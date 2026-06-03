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
    case "whot":
      return <WhotCover className={className} />;
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

function WhotCover({ className }: { className?: string }) {
  // a fanned hand of Whot cards, each showing a shape
  const cards = [
    { rot: -28, x: 96, shape: "circle", c: "#8b7dff" },
    { rot: -14, x: 124, shape: "triangle", c: "#27e1a6" },
    { rot: 0, x: 154, shape: "cross", c: "#ffc15e" },
    { rot: 14, x: 184, shape: "square", c: "#ff6b9a" },
    { rot: 28, x: 212, shape: "star", c: "#a89bff" },
  ];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <radialGradient id="wbg" cx="0.5" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#23224d" />
          <stop offset="1" stopColor="#0a0918" />
        </radialGradient>
        <radialGradient id="wfelt" cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor="rgba(39,225,166,0.18)" />
          <stop offset="1" stopColor="rgba(39,225,166,0)" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#wbg)" />
      <rect width="320" height="200" fill="url(#wfelt)" />
      {cards.map((card, i) => (
        <g key={i} transform={`translate(${card.x} 150) rotate(${card.rot})`}>
          <rect x="-26" y="-46" width="52" height="74" rx="8" fill="#f7f4ec" stroke="#d8d2c4" strokeWidth="1.2" />
          <rect x="-26" y="-46" width="52" height="74" rx="8" fill="none" stroke={card.c} strokeWidth="2" opacity="0.35" />
          <g fill={card.c}>
            <WhotShape shape={card.shape} cx={0} cy={-9} s={1.15} />
            <WhotShape shape={card.shape} cx={-18} cy={-37} s={0.5} />
            <WhotShape shape={card.shape} cx={18} cy={19} s={0.5} />
          </g>
        </g>
      ))}
    </svg>
  );
}

function WhotShape({ shape, cx, cy, s }: { shape: string; cx: number; cy: number; s: number }) {
  const r = 11 * s;
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={r} />;
    case "triangle":
      return <path d={`M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.8} L ${cx - r} ${cy + r * 0.8} Z`} />;
    case "cross":
      return (
        <path
          d={`M ${cx - r * 0.34} ${cy - r} h ${r * 0.68} v ${r * 0.66} h ${r * 0.66} v ${r * 0.68} h ${-r * 0.66} v ${r * 0.66} h ${-r * 0.68} v ${-r * 0.66} h ${-r * 0.66} v ${-r * 0.68} h ${r * 0.66} Z`}
        />
      );
    case "square":
      return <rect x={cx - r * 0.85} y={cy - r * 0.85} width={r * 1.7} height={r * 1.7} rx={r * 0.18} />;
    case "star":
      return <Star cx={cx} cy={cy} r={r} />;
    default:
      return null;
  }
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
