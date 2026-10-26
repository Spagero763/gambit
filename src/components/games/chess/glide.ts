import { CSSProperties, useRef } from "react";
import { Chess, Square } from "chess.js";

const FILES = "abcdefgh";

export interface Slide {
  from: Square;
  to: Square;
}

// What the side to move shifted between two positions. Castling moves two
// pieces, so it pairs them by type; a promotion pairs the pawn with its queen.
export function slidesBetween(prev: string, next: string): Slide[] {
  let a: Chess, b: Chess;
  try {
    a = new Chess(prev);
    b = new Chess(next);
  } catch {
    return [];
  }
  const mover = a.turn();
  const gone: { sq: Square; type: string }[] = [];
  const came: { sq: Square; type: string }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = (FILES[f] + (8 - r)) as Square;
      const p = a.get(sq);
      const q = b.get(sq);
      const same = p && q && p.color === q.color && p.type === q.type;
      if (p && p.color === mover && !same) gone.push({ sq, type: p.type });
      if (q && q.color === mover && !same) came.push({ sq, type: q.type });
    }
  }
  if (gone.length > 2 || came.length > 2) return [];
  if (gone.length === 1 && came.length === 1) return [{ from: gone[0].sq, to: came[0].sq }];
  return gone.flatMap((g) => {
    const c = came.find((x) => x.type === g.type);
    return c ? [{ from: g.sq, to: c.sq }] : [];
  });
}

// Worked out during render, so the piece never flashes at its new square first.
export function useSlides(fen: string | undefined, skip = false) {
  const ref = useRef<{ fen?: string; n: number; moves: Slide[] }>({ fen, n: 0, moves: [] });
  if (fen && fen !== ref.current.fen) {
    const moves = ref.current.fen && !skip ? slidesBetween(ref.current.fen, fen) : [];
    ref.current = { fen, n: ref.current.n + 1, moves };
  }
  return ref.current;
}

const col = (sq: Square) => FILES.indexOf(sq[0]);
const row = (sq: Square) => 8 - Number(sq[1]);

// Props for the piece standing on `square`: a fresh key so the slide replays,
// and its starting offset in squares (mirrored when the board is flipped).
export function glideFor(square: Square, slides: { n: number; moves: Slide[] }, flip = false) {
  const s = slides.moves.find((m) => m.to === square);
  if (!s) return { key: square };
  const k = flip ? -100 : 100;
  return {
    key: `${square}-${slides.n}`,
    on: "",
    style: { "--gx": `${(col(s.from) - col(s.to)) * k}%`, "--gy": `${(row(s.from) - row(s.to)) * k}%` } as CSSProperties,
  };
}
