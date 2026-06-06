// Fixed board layout for STAKED snakes & ladders, shared by the authoritative
// server and the client renderer so both agree on every jump.
export const SNAKES_LADDERS: { ladders: Record<number, number>; snakes: Record<number, number> } = {
  ladders: { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 },
  snakes: { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 99: 78 },
};

/** Resolve a square to its destination (top of a ladder / bottom of a snake / itself). */
export function jumpTo(n: number): number {
  return SNAKES_LADDERS.ladders[n] ?? SNAKES_LADDERS.snakes[n] ?? n;
}

/** Centre of square `n` (1..100) as fractions of the board, boustrophedon from bottom-left. */
export function centerFrac(n: number) {
  const idx = Math.max(1, n) - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const posInRow = idx % 10;
  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow;
  const rowFromTop = 9 - rowFromBottom;
  return { x: (col + 0.5) / 10, y: (rowFromTop + 0.5) / 10 };
}
