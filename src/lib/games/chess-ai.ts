import { Chess, Move } from "chess.js";

const VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const INF = 1_000_000;

/** Material balance from white's perspective. */
function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const v = VALUE[sq.type];
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

/** Captures and promotions first improves alpha-beta pruning. */
function order(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => weight(b) - weight(a));
}

function weight(m: Move): number {
  let w = 0;
  if (m.captured) w += VALUE[m.captured];
  if (m.promotion) w += VALUE[m.promotion];
  return w;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isGameOver()) {
    if (game.isCheckmate()) return -INF + (10 - depth); // closer mate is better
    return 0; // draw of some kind
  }
  if (depth === 0) {
    const side = game.turn() === "w" ? 1 : -1;
    return side * evaluate(game);
  }

  let best = -INF;
  for (const m of order(game.moves({ verbose: true }) as Move[])) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Returns the engine's chosen move for the side to move. Depth 2 keeps it
 * snappy on mobile while still punishing blunders and grabbing hanging pieces.
 * Ties are broken at random so games do not play out identically.
 */
export function chooseMove(fen: string, depth = 2): Move | null {
  const game = new Chess(fen);
  const moves = order(game.moves({ verbose: true }) as Move[]);
  if (moves.length === 0) return null;

  let best = -INF;
  let pick: Move[] = [];
  for (const m of moves) {
    game.move(m);
    const score = -negamax(game, depth - 1, -INF, INF);
    game.undo();
    if (score > best) {
      best = score;
      pick = [m];
    } else if (score === best) {
      pick.push(m);
    }
  }
  return pick[Math.floor(Math.random() * pick.length)] ?? moves[0];
}

/**
 * Difficulty-aware move selection.
 * easy: shallow, often plays a random legal move (forgiving).
 * normal: depth-2 search. hard: depth-3 search (sharper).
 */
export function chooseMoveByLevel(fen: string, level: "easy" | "normal" | "hard"): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  if (level === "easy") {
    // mostly random, occasionally takes a free capture
    if (Math.random() < 0.6) return moves[Math.floor(Math.random() * moves.length)];
    return chooseMove(fen, 1);
  }
  return chooseMove(fen, level === "hard" ? 3 : 2);
}
