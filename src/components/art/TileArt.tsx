import { CSSProperties } from "react";
import { WhotCardBack, WhotCardFace } from "@/components/games/whot/WhotCard";
import { ChessGlyph } from "@/components/games/chess/ChessPiece";
import type { PieceSymbol } from "chess.js";
import type { Shape } from "@/lib/games/whot";
import { Felt } from "./Felt";

const HAND: { shape: Shape; num: number }[] = [
  { shape: "circle", num: 3 },
  { shape: "triangle", num: 7 },
  { shape: "whot", num: 20 },
  { shape: "star", num: 5 },
  { shape: "cross", num: 14 },
];

/** A fanned Whot hand. Cards deal in from below once, in CSS, on first paint. */
export function WhotFan({ className, deal = true, card = 76 }: { className?: string; deal?: boolean; card?: number }) {
  const h = Math.round(card * 1.42);
  const step = Math.round(card * 0.53);
  return (
    <div className={className} aria-hidden>
      <div className="relative h-full w-full">
        {HAND.map((c, i) => {
          const mid = (HAND.length - 1) / 2;
          const rot = (i - mid) * 11;
          const lift = Math.abs(i - mid) * card * 0.09;
          const style = {
            "--rot": `${rot}deg`,
            "--dx": `${(mid - i) * 18}px`,
            width: card,
            height: h,
            left: `calc(50% - ${card / 2}px + ${(i - mid) * step}px)`,
            bottom: `${-lift}px`,
            transform: `rotate(${rot}deg)`,
            transformOrigin: "50% 120%",
            animation: deal ? `deal 620ms cubic-bezier(0.23,1,0.32,1) ${160 + i * 70}ms both` : undefined,
            zIndex: i,
          } as CSSProperties;
          return (
            <div key={i} className="absolute" style={style}>
              <WhotCardFace shape={c.shape} num={c.num} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Whot on a lit felt table: the market pile, and a hand being dealt. */
export function WhotTableArt({ className, card = 80 }: { className?: string; card?: number }) {
  return (
    <div className={className} aria-hidden>
      <Felt glow="50% 110%" rail={false} />
      <div className="absolute" style={{ right: "8%", top: "24%", width: card * 0.58, height: card * 0.82, transform: "rotate(16deg)" }}>
        <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] opacity-80">
          <WhotCardBack />
        </div>
        <WhotCardBack />
      </div>
      <WhotFan card={card} className="absolute inset-x-0 bottom-[-14px] h-[70%]" />
    </div>
  );
}

const VB = "0 0 200 160";

export function ChessArt({ className }: { className?: string }) {
  const S = 24;
  const squares: JSX.Element[] = [];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 9; c++)
      squares.push(<rect key={`${r}${c}`} x={c * S - 8} y={r * S + 40} width={S} height={S} fill={(r + c) % 2 ? "#8c623d" : "#d9bf95"} />);
  const piece = (t: PieceSymbol, color: "w" | "b", x: number, y: number, k: number) => (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <ellipse cx="22.5" cy="42" rx="15" ry="4" fill="rgba(0,0,0,0.45)" />
      <ChessGlyph type={t} color={color} />
    </g>
  );
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1c10" />
          <stop offset="1" stopColor="#120c07" />
        </linearGradient>
        <radialGradient id="ch-spot" cx="0.5" cy="0.15" r="0.75">
          <stop offset="0" stopColor="rgba(255,226,170,0.45)" />
          <stop offset="1" stopColor="rgba(255,226,170,0)" />
        </radialGradient>
        <linearGradient id="ch-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(18,12,7,0.95)" />
          <stop offset="0.45" stopColor="rgba(18,12,7,0)" />
        </linearGradient>
      </defs>
      <rect width="200" height="160" fill="url(#ch-sky)" />
      <g transform="translate(100 96) scale(1 0.62) translate(-100 -96)">{squares}</g>
      <rect width="200" height="160" fill="url(#ch-fade)" />
      {piece("q", "b", 34, 54, 1.25)}
      {piece("k", "w", 96, 40, 1.65)}
      {piece("n", "b", 150, 74, 1.05)}
      <rect width="200" height="160" fill="url(#ch-spot)" />
    </svg>
  );
}

export function XOArt({ className }: { className?: string }) {
  const cell = 32;
  const ox = (200 - cell * 3) / 2;
  const oy = (160 - cell * 3) / 2;
  const at = (r: number, c: number) => ({ x: ox + c * cell + cell / 2, y: oy + r * cell + cell / 2 });
  const X = (r: number, c: number) => {
    const { x, y } = at(r, c);
    const d = 8.5;
    return <path key={`x${r}${c}`} d={`M${x - d} ${y - d} L${x + d} ${y + d} M${x + d} ${y - d} L${x - d} ${y + d}`} stroke="#5aa9ff" strokeWidth="5.5" strokeLinecap="round" filter="url(#xo-glow)" />;
  };
  const O = (r: number, c: number) => {
    const { x, y } = at(r, c);
    return <circle key={`o${r}${c}`} cx={x} cy={y} r="9.5" fill="none" stroke="#ffb547" strokeWidth="5.5" filter="url(#xo-glow)" />;
  };
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id="xo-bg" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0" stopColor="#17243d" />
          <stop offset="1" stopColor="#070b14" />
        </radialGradient>
        <filter id="xo-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" fill="url(#xo-bg)" />
      <g stroke="rgba(190,215,255,0.45)" strokeWidth="2.2" strokeLinecap="round" filter="url(#xo-glow)">
        <path d={`M${ox + cell} ${oy + 4} V${oy + cell * 3 - 4} M${ox + cell * 2} ${oy + 4} V${oy + cell * 3 - 4}`} />
        <path d={`M${ox + 4} ${oy + cell} H${ox + cell * 3 - 4} M${ox + 4} ${oy + cell * 2} H${ox + cell * 3 - 4}`} />
      </g>
      {X(0, 0)}
      {O(0, 2)}
      {X(1, 1)}
      {O(1, 0)}
      {O(2, 1)}
      {X(2, 2)}
      <path d={`M${at(0, 0).x - 6} ${at(0, 0).y - 6} L${at(2, 2).x + 6} ${at(2, 2).y + 6}`} stroke="#f2f5f8" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" filter="url(#xo-glow)" />
    </svg>
  );
}

export function SnakesArt({ className }: { className?: string }) {
  const COLS = 6;
  const ROWS = 5;
  const cw = 200 / COLS;
  const ch = 160 / ROWS;
  const tones = ["#f7e7c4", "#f0d59f"];
  const cells: JSX.Element[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const fromBottom = ROWS - 1 - r;
      const col = fromBottom % 2 === 0 ? c : COLS - 1 - c;
      cells.push(
        <g key={`${r}${c}`}>
          <rect x={c * cw} y={r * ch} width={cw} height={ch} fill={tones[(r + c) % 2]} />
          <text x={c * cw + 4} y={r * ch + 11} fontSize="8.5" fontWeight="800" fill="rgba(110,70,30,0.45)">
            {fromBottom * COLS + col + 1}
          </text>
        </g>
      );
    }
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id="sn-light" cx="0.3" cy="0.1" r="0.9">
          <stop offset="0" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.25)" />
        </radialGradient>
        <linearGradient id="sn-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ee09b" />
          <stop offset="1" stopColor="#139a62" />
        </linearGradient>
      </defs>
      {cells}
      <g stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round">
        <path d="M40 150 L62 26 M57 153 L79 29" />
        {[0, 1, 2, 3, 4, 5].map((t) => {
          const f = t / 5;
          return <path key={t} d={`M${40 + 22 * f + 2} ${150 - 124 * f} L${57 + 22 * f - 2} ${153 - 124 * f}`} />;
        })}
      </g>
      <path d="M152 20 C 190 46, 112 66, 152 92 S 128 134, 164 150" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="14" strokeLinecap="round" transform="translate(2 3)" />
      <path d="M152 20 C 190 46, 112 66, 152 92 S 128 134, 164 150" fill="none" stroke="url(#sn-body)" strokeWidth="12" strokeLinecap="round" />
      <path d="M152 20 C 190 46, 112 66, 152 92 S 128 134, 164 150" fill="none" stroke="#0b6e45" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 9" />
      <ellipse cx="152" cy="19" rx="11" ry="9" fill="#3ee09b" />
      <circle cx="148" cy="16" r="2.2" fill="#05070c" />
      <circle cx="156" cy="16" r="2.2" fill="#05070c" />
      <path d="M152 28 l-2 6 m2 -6 l2 6" stroke="#ff5d6c" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="104" cy="108" r="10" fill="#5aa9ff" stroke="#05070c" strokeWidth="3" />
      <circle cx="124" cy="76" r="10" fill="#ffb547" stroke="#05070c" strokeWidth="3" />
      <rect width="200" height="160" fill="url(#sn-light)" />
    </svg>
  );
}

export function BlocksArt({ className }: { className?: string }) {
  const N = 7;
  const size = 122;
  const cell = size / N;
  const ox = (200 - size) / 2;
  const oy = 160 - size - 10;
  const C = ["", "#5aa9ff", "#ffb547", "#3ee09b", "#ff5d6c", "#b18cff"];
  const grid = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 2, 0, 3, 3],
    [1, 0, 0, 2, 0, 0, 3],
    [1, 1, 4, 4, 0, 5, 5],
    [5, 1, 4, 0, 3, 3, 5],
    [5, 5, 2, 2, 2, 3, 1],
  ];
  const block = (x: number, y: number, w: number, color: string, key: string) => (
    <g key={key}>
      <rect x={x} y={y} width={w} height={w} rx={w * 0.2} fill={color} />
      <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={(w - 3) * 0.45} rx={w * 0.16} fill="rgba(255,255,255,0.35)" />
      <rect x={x} y={y + w * 0.78} width={w} height={w * 0.22} rx={w * 0.12} fill="rgba(0,0,0,0.22)" />
    </g>
  );
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id="bl-bg" cx="0.5" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#24183f" />
          <stop offset="1" stopColor="#0a0816" />
        </radialGradient>
      </defs>
      <rect width="200" height="160" fill="url(#bl-bg)" />
      <rect x={ox - 5} y={oy - 5} width={size + 10} height={size + 10} rx="12" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.08)" />
      {grid.flatMap((row, r) =>
        row.map((v, c) =>
          v ? block(ox + c * cell + 1.2, oy + r * cell + 1.2, cell - 2.4, C[v], `${r}${c}`) : <rect key={`${r}${c}`} x={ox + c * cell + 1.2} y={oy + r * cell + 1.2} width={cell - 2.4} height={cell - 2.4} rx="3.5" fill="rgba(255,255,255,0.04)" />
        )
      )}
      <g transform="translate(116 8) rotate(12)">
        {block(0, 0, 17, "#3ee09b", "f1")}
        {block(17, 0, 17, "#3ee09b", "f2")}
        {block(17, 17, 17, "#3ee09b", "f3")}
      </g>
    </svg>
  );
}

export function GameArt({ slug, className }: { slug: string; className?: string }) {
  switch (slug) {
    case "chess":
      return <ChessArt className={className} />;
    case "tic-tac-toe":
      return <XOArt className={className} />;
    case "snakes":
      return <SnakesArt className={className} />;
    case "blocks":
      return <BlocksArt className={className} />;
    default:
      return <WhotTableArt className={className} />;
  }
}
