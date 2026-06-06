import { Game } from "@/lib/games";
import { ChessGlyph } from "@/components/games/chess/ChessPiece";
import type { PieceSymbol } from "chess.js";

const VB = "0 0 320 200";
const SLICE = "xMidYMid slice";

const MEEPLE_PATH =
  "M50 5C40 5 33 13 33 22C33 28 36 33 41 36C30 39 22 47 17 58C15 62 17 67 22 67L36 67C36 67 33 75 33 82C33 90 40 95 50 95C60 95 67 90 67 82C67 75 64 67 64 67L78 67C83 67 85 62 83 58C78 47 70 39 59 36C64 33 67 28 67 22C67 13 60 5 50 5Z";

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

/* ============================ CHESS ============================ */
/* A real 2D board (chess.com-style light/green squares) seen top-down with the
   genuine Staunton pieces in a 1.e4 e5 opening. */
function ChessCover({ className }: { className?: string }) {
  const COLS = 8;
  const ROWS = 5;
  const S = 40; // square size → 8*40=320 wide, 5*40=200 tall, exact fill
  const LIGHT = "#eeeed2";
  const DARK = "#6f9b55";

  // 5 visible ranks of a 1.e4 e5 position
  const board: (PieceSymbol | null)[][] = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", null, "p", "p", "p"],
    [null, null, null, null, "p", null, null, null],
    [null, null, null, null, "p", null, null, null],
    ["p", "p", "p", "p", null, "p", "p", "p"],
  ];
  const colorOf = (r: number): "w" | "b" => (r <= 2 ? "b" : "w");

  const squares: JSX.Element[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      squares.push(
        <rect
          key={`s${r}-${c}`}
          x={c * S}
          y={r * S}
          width={S}
          height={S}
          fill={(r + c) % 2 === 0 ? LIGHT : DARK}
        />
      );
    }
  }

  const pieces: JSX.Element[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = board[r][c];
      if (!t) continue;
      const k = S / 45;
      pieces.push(
        <g key={`p${r}-${c}`} transform={`translate(${c * S + (S - 45 * k) / 2} ${r * S + (S - 45 * k) / 2}) scale(${k})`}>
          <ChessGlyph type={t} color={colorOf(r)} />
        </g>
      );
    }
  }

  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      {squares}
      {/* last-move highlight on the e-file */}
      <rect x={4 * S} y={2 * S} width={S} height={S} fill="#f6d66b" opacity="0.4" />
      <rect x={4 * S} y={3 * S} width={S} height={S} fill="#f6d66b" opacity="0.4" />
      {pieces}
      {/* soft top light + bottom scrim are added by the card itself */}
      <rect width="320" height="200" fill="url(#chessSheen)" />
      <defs>
        <linearGradient id="chessSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ============================ TIC-TAC-TOE ============================ */
function XOCover({ className }: { className?: string }) {
  const O = "#3ecf8e";
  const X = "#c7c2ff";
  // centered 3x3, square 46, board 138, origin so it's centred
  const cell = 46;
  const ox = (320 - cell * 3) / 2;
  const oy = (200 - cell * 3) / 2;
  const center = (r: number, c: number) => ({ x: ox + c * cell + cell / 2, y: oy + r * cell + cell / 2 });

  const drawX = (r: number, c: number, key: string) => {
    const { x, y } = center(r, c);
    const d = 13;
    return (
      <g key={key} stroke={X} strokeWidth="7" strokeLinecap="round">
        <line x1={x - d} y1={y - d} x2={x + d} y2={y + d} />
        <line x1={x + d} y1={y - d} x2={x - d} y2={y + d} />
      </g>
    );
  };
  const drawO = (r: number, c: number, key: string) => {
    const { x, y } = center(r, c);
    return <circle key={key} cx={x} cy={y} r="14" fill="none" stroke={O} strokeWidth="7" />;
  };

  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <rect width="320" height="200" fill="#101319" />
      <rect width="320" height="200" fill="url(#xoGlow)" />
      <defs>
        <radialGradient id="xoGlow" cx="0.5" cy="0.32" r="0.7">
          <stop offset="0" stopColor="rgba(62,207,142,0.16)" />
          <stop offset="1" stopColor="rgba(62,207,142,0)" />
        </radialGradient>
      </defs>
      {/* grid */}
      <g stroke="rgba(255,255,255,0.16)" strokeWidth="3" strokeLinecap="round">
        <line x1={ox + cell} y1={oy} x2={ox + cell} y2={oy + cell * 3} />
        <line x1={ox + cell * 2} y1={oy} x2={ox + cell * 2} y2={oy + cell * 3} />
        <line x1={ox} y1={oy + cell} x2={ox + cell * 3} y2={oy + cell} />
        <line x1={ox} y1={oy + cell * 2} x2={ox + cell * 3} y2={oy + cell * 2} />
      </g>
      {/* a near-finished game: X wins the main diagonal */}
      {drawX(0, 0, "x1")}
      {drawO(0, 1, "o1")}
      {drawO(0, 2, "o2")}
      {drawX(1, 1, "x2")}
      {drawO(1, 0, "o3")}
      {drawX(2, 2, "x3")}
      {drawX(2, 0, "x4")}
      {/* winning line */}
      <line
        x1={center(0, 0).x}
        y1={center(0, 0).y}
        x2={center(2, 2).x}
        y2={center(2, 2).y}
        stroke="#f6d66b"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/* ============================ SNAKES & LADDERS ============================ */
function SnakesCover({ className }: { className?: string }) {
  const COLS = 6;
  const ROWS = 4;
  const pad = 12;
  const cw = (320 - pad * 2) / COLS;
  const ch = (200 - pad * 2) / ROWS;
  const cellX = (c: number) => pad + c * cw;
  const cellY = (r: number) => pad + r * ch;
  const tint = ["#2a2418", "#332b1b"];

  const cells: JSX.Element[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // boustrophedon numbering from bottom-left = 1
      const fromBottom = ROWS - 1 - r;
      const leftToRight = fromBottom % 2 === 0;
      const col = leftToRight ? c : COLS - 1 - c;
      const n = fromBottom * COLS + col + 1;
      cells.push(
        <g key={`${r}-${c}`}>
          <rect
            x={cellX(c) + 1.5}
            y={cellY(r) + 1.5}
            width={cw - 3}
            height={ch - 3}
            rx="5"
            fill={tint[(r + c) % 2]}
            stroke="rgba(227,179,65,0.18)"
            strokeWidth="1"
          />
          <text x={cellX(c) + 6} y={cellY(r) + 15} fontSize="9" fill="rgba(255,255,255,0.32)" fontFamily="monospace">
            {n}
          </text>
        </g>
      );
    }
  }

  const lx1 = cellX(1) + cw / 2;
  const ly1 = cellY(3) + ch / 2;
  const lx2 = cellX(1) + cw / 2 + 8;
  const ly2 = cellY(0) + ch / 2;

  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <rect width="320" height="200" fill="#171206" />
      {cells}

      {/* ladder */}
      <g stroke="#46c08a" strokeWidth="3" strokeLinecap="round">
        <line x1={lx1 - 7} y1={ly1} x2={lx2 - 7} y2={ly2} />
        <line x1={lx1 + 7} y1={ly1} x2={lx2 + 7} y2={ly2} />
        {[0, 1, 2, 3, 4].map((t) => {
          const f = t / 4;
          return (
            <line
              key={t}
              x1={lx1 - 7 + (lx2 - lx1) * f}
              y1={ly1 + (ly2 - ly1) * f}
              x2={lx1 + 7 + (lx2 - lx1) * f}
              y2={ly1 + (ly2 - ly1) * f}
            />
          );
        })}
      </g>

      {/* snake */}
      <path
        d={`M${cellX(4) + cw / 2} ${cellY(0) + ch / 2} q ${cw * 0.9} ${ch} 0 ${ch * 1.3} q ${-cw} ${ch * 0.6} 6 ${ch * 1.4}`}
        fill="none"
        stroke="#e06c8b"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx={cellX(4) + cw / 2} cy={cellY(0) + ch / 2} r="8" fill="#e06c8b" />
      <circle cx={cellX(4) + cw / 2 - 2.5} cy={cellY(0) + ch / 2 - 2} r="1.5" fill="#171206" />
      <circle cx={cellX(4) + cw / 2 + 2.5} cy={cellY(0) + ch / 2 - 2} r="1.5" fill="#171206" />

      {/* player token (meeple) */}
      <g transform={`translate(${cellX(3) + cw / 2} ${cellY(2) + ch / 2})`}>
        <ellipse cx="0" cy="9" rx="9" ry="3" fill="rgba(0,0,0,0.45)" />
        <g transform="translate(-10 -13) scale(0.2)">
          <path d={MEEPLE_PATH} fill="#3ecf8e" stroke="#0a0a0c" strokeWidth={6} strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

/* ============================ BLOCK BLITZ ============================ */
function BlocksCover({ className }: { className?: string }) {
  const N = 8;
  const size = 168;
  const cell = size / N;
  const ox = (320 - size) / 2;
  const oy = (200 - size) / 2;

  // 0 = empty, otherwise palette index
  const C = ["", "#5d58c9", "#3ecf8e", "#e3b341", "#e06c8b", "#8e8bf0"];
  // a believable mid-game board (rows from top to bottom)
  const grid = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 5, 5, 0, 0, 0, 0],
    [0, 0, 0, 5, 0, 0, 2, 2],
    [3, 0, 0, 0, 0, 0, 0, 2],
    [3, 3, 1, 1, 0, 4, 4, 0],
    [1, 1, 1, 0, 2, 2, 4, 4],
    [1, 3, 3, 3, 2, 0, 4, 1],
    [1, 1, 3, 2, 2, 2, 1, 1],
  ];

  const cells: JSX.Element[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      const x = ox + c * cell;
      const y = oy + r * cell;
      cells.push(
        <rect
          key={`bg${r}-${c}`}
          x={x + 1.5}
          y={y + 1.5}
          width={cell - 3}
          height={cell - 3}
          rx="3.5"
          fill={v ? C[v] : "rgba(255,255,255,0.04)"}
        />
      );
      if (v) {
        cells.push(
          <rect
            key={`hi${r}-${c}`}
            x={x + 1.5}
            y={y + 1.5}
            width={cell - 3}
            height={(cell - 3) / 2}
            rx="3.5"
            fill="rgba(255,255,255,0.18)"
          />
        );
      }
    }
  }

  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <rect width="320" height="200" fill="#120a14" />
      <rect x={ox - 6} y={oy - 6} width={size + 12} height={size + 12} rx="14" fill="#1a1320" stroke="rgba(255,255,255,0.06)" />
      {cells}
    </svg>
  );
}

/* ============================ NAIJA WHOT ============================ */
const WHOT = [
  { shape: "circle", num: 3, c: "#8e8bf0" },
  { shape: "triangle", num: 5, c: "#3ecf8e" },
  { shape: "cross", num: 2, c: "#e3b341" },
  { shape: "square", num: 7, c: "#e06c8b" },
  { shape: "star", num: 8, c: "#aaa7ff" },
] as const;

function WhotCover({ className }: { className?: string }) {
  const fan = [-26, -13, 0, 13, 26];
  const baseX = [120, 142, 160, 178, 200];
  return (
    <svg viewBox={VB} preserveAspectRatio={SLICE} className={className}>
      <defs>
        <radialGradient id="whotFelt" cx="0.5" cy="0.95" r="0.9">
          <stop offset="0" stopColor="#1c3a2d" />
          <stop offset="1" stopColor="#0c130f" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#whotFelt)" />
      {WHOT.map((card, i) => (
        <g key={i} transform={`translate(${baseX[i]} 150) rotate(${fan[i]})`}>
          <rect x="-28" y="-50" width="56" height="80" rx="9" fill="#f7f4ec" stroke="#cfc7b6" strokeWidth="1.2" />
          <rect x="-28" y="-50" width="56" height="6" rx="3" fill={card.c} />
          {/* corner index */}
          <text x="-22" y="-33" fontSize="13" fontWeight="800" fill={card.c} fontFamily="ui-sans-serif, system-ui">
            {card.num}
          </text>
          {/* center shape */}
          <g fill={card.c}>
            <WhotShape shape={card.shape} cx={0} cy={-6} r={13} />
          </g>
          {/* bottom-right mini */}
          <g fill={card.c} opacity="0.9">
            <WhotShape shape={card.shape} cx={20} cy={22} r={5} />
          </g>
        </g>
      ))}
    </svg>
  );
}

function WhotShape({ shape, cx, cy, r }: { shape: string; cx: number; cy: number; r: number }) {
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
