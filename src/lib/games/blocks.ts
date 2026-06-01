export type Accent = "violet" | "teal" | "amber" | "rose";
export type CellOffset = [number, number];

export interface Piece {
  id: string;
  cells: CellOffset[];
  color: Accent;
  w: number;
  h: number;
}

export const GRID = 8;
export type Grid = (Accent | null)[][];

export function emptyGrid(): Grid {
  return Array.from({ length: GRID }, () => Array<Accent | null>(GRID).fill(null));
}

// Shape library (no rotation, matching block-blast style).
const SHAPES: CellOffset[][] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]], // 2x2
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], // 2x3
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], // 3x2
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], // 3x3
  [[0, 0], [1, 0], [1, 1]], // small L
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], // J
  [[0, 1], [1, 1], [2, 1], [2, 0]], // L
  [[0, 0], [0, 1], [0, 2], [1, 1]], // T
  [[0, 1], [1, 0], [1, 1], [1, 2]], // T down
  [[0, 0], [0, 1], [1, 1], [1, 2]], // S
  [[0, 1], [0, 2], [1, 0], [1, 1]], // Z
];

const COLORS: Accent[] = ["violet", "teal", "amber", "rose"];

function dims(cells: CellOffset[]) {
  let w = 0;
  let h = 0;
  for (const [r, c] of cells) {
    w = Math.max(w, c + 1);
    h = Math.max(h, r + 1);
  }
  return { w, h };
}

/** Deterministic piece generation driven by a passed-in rng (0..1). */
export function makePieces(rng: () => number, n = 3): Piece[] {
  return Array.from({ length: n }, (_, i) => {
    const cells = SHAPES[Math.floor(rng() * SHAPES.length)];
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    const { w, h } = dims(cells);
    return { id: `${Date.now()}-${i}-${Math.floor(rng() * 1e6)}`, cells, color, w, h };
  });
}

export function canPlace(grid: Grid, piece: Piece, r0: number, c0: number): boolean {
  for (const [r, c] of piece.cells) {
    const rr = r0 + r;
    const cc = c0 + c;
    if (rr < 0 || cc < 0 || rr >= GRID || cc >= GRID) return false;
    if (grid[rr][cc]) return false;
  }
  return true;
}

export function place(grid: Grid, piece: Piece, r0: number, c0: number): Grid {
  const g = grid.map((row) => row.slice());
  for (const [r, c] of piece.cells) g[r0 + r][c0 + c] = piece.color;
  return g;
}

export interface ClearResult {
  grid: Grid;
  rows: number[];
  cols: number[];
  cleared: number; // number of lines
}

export function clearLines(grid: Grid): ClearResult {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < GRID; r++) if (grid[r].every((c) => c)) rows.push(r);
  for (let c = 0; c < GRID; c++) if (grid.every((row) => row[c])) cols.push(c);

  const g = grid.map((row) => row.slice());
  for (const r of rows) for (let c = 0; c < GRID; c++) g[r][c] = null;
  for (const c of cols) for (let r = 0; r < GRID; r++) g[r][c] = null;

  return { grid: g, rows, cols, cleared: rows.length + cols.length };
}

export function anyMove(grid: Grid, pieces: Piece[]): boolean {
  for (const p of pieces) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (canPlace(grid, p, r, c)) return true;
      }
    }
  }
  return false;
}
