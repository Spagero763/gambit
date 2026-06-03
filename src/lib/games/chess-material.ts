import { Chess, Color, PieceSymbol } from "chess.js";

const FULL: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

/** Pieces of `color` currently on the board, counted by type. */
function counts(game: Chess, color: Color) {
  const c: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.color === color) c[sq.type] += 1;
    }
  }
  return c;
}

/**
 * Returns the list of `color` pieces that have been captured (are missing from
 * a full set), most valuable first, plus the total material value lost.
 */
export function capturedOf(game: Chess, color: Color) {
  const have = counts(game, color);
  const list: PieceSymbol[] = [];
  let lost = 0;
  for (const t of ORDER) {
    const missing = FULL[t] - have[t];
    for (let i = 0; i < missing; i++) {
      list.push(t);
      lost += VALUE[t];
    }
  }
  return { list, lost };
}

/** Material advantage from white's perspective (positive = white ahead). */
export function materialEdge(game: Chess) {
  const w = capturedOf(game, "b").lost; // black pieces white took
  const b = capturedOf(game, "w").lost;
  return w - b;
}
