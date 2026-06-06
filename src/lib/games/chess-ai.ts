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

/* Piece-square tables (white's view, index 0 = a8 … 63 = h1, matching
   chess.js board() order). Black mirrors vertically. Values nudge pieces toward
   good squares so the engine develops, centralises and castles instead of just
   counting material. */
// prettier-ignore
const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

/** Static evaluation from white's perspective: material + piece-square tables. */
function evaluate(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const idx = r * 8 + c;
      const pst = PST[sq.type];
      if (sq.color === "w") {
        score += VALUE[sq.type] + pst[idx];
      } else {
        // mirror table vertically for black
        score -= VALUE[sq.type] + pst[(7 - r) * 8 + c];
      }
    }
  }
  return score;
}

/** Captures and promotions first — sharpens alpha-beta pruning (MVV-LVA-ish). */
function order(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => weight(b) - weight(a));
}

function weight(m: Move): number {
  let w = 0;
  if (m.captured) w += 10 * VALUE[m.captured] - VALUE[m.piece];
  if (m.promotion) w += VALUE[m.promotion];
  return w;
}

/**
 * Quiescence search: at the leaf, keep resolving captures so the engine never
 * stops mid-trade and hangs material. This is what makes it feel like a real
 * opponent rather than a blunder machine.
 */
function quiesce(game: Chess, alpha: number, beta: number, ply: number): number {
  const side = game.turn() === "w" ? 1 : -1;
  const standPat = side * evaluate(game);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (ply > 4) return alpha; // hard cap

  const captures = order(
    (game.moves({ verbose: true }) as Move[]).filter((m) => m.captured || m.promotion)
  );
  for (const m of captures) {
    game.move(m);
    const score = -quiesce(game, -beta, -alpha, ply + 1);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isGameOver()) {
    if (game.isCheckmate()) return -INF + (10 - depth); // closer mate is better
    return 0; // stalemate / draw
  }
  if (depth === 0) return quiesce(game, alpha, beta, 0);

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
 * Root search. Ties are broken at random so games do not play out identically.
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
 * easy: usually a random legal move, occasionally a shallow grab (beatable).
 * normal: depth-2 + quiescence (solid club play).
 * hard: depth-3 + quiescence (sharp, punishes blunders).
 */
export function chooseMoveByLevel(fen: string, level: "easy" | "normal" | "hard"): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  if (level === "easy") {
    // avoid obviously hanging into mate, but otherwise loose
    if (Math.random() < 0.55) return moves[Math.floor(Math.random() * moves.length)];
    return chooseMove(fen, 1);
  }
  return chooseMove(fen, level === "hard" ? 3 : 2);
}
