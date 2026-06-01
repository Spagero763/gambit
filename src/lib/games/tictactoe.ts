export type Cell = "X" | "O" | null;
export type Board = Cell[]; // length 9

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface Outcome {
  winner: Cell; // null if none yet or draw
  line: number[] | null;
  draw: boolean;
}

export function evaluate(board: Board): Outcome {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line, draw: false };
    }
  }
  const draw = board.every((c) => c !== null);
  return { winner: null, line: null, draw };
}

/**
 * Minimax with alpha-beta pruning. Returns the best move index for `player`.
 * Plays perfectly, so the AI is unbeatable on the "hard" setting.
 */
export function bestMove(board: Board, player: "X" | "O"): number {
  const opponent = player === "X" ? "O" : "X";

  function score(b: Board, depth: number, isMax: boolean, alpha: number, beta: number): number {
    const { winner, draw } = evaluate(b);
    if (winner === player) return 10 - depth;
    if (winner === opponent) return depth - 10;
    if (draw) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = player;
          best = Math.max(best, score(b, depth + 1, false, alpha, beta));
          b[i] = null;
          alpha = Math.max(alpha, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = opponent;
          best = Math.min(best, score(b, depth + 1, true, alpha, beta));
          b[i] = null;
          beta = Math.min(beta, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    }
  }

  let move = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = player;
      const s = score(board, 0, false, -Infinity, Infinity);
      board[i] = null;
      if (s > bestScore) {
        bestScore = s;
        move = i;
      }
    }
  }
  return move;
}

/** Picks a random empty cell, used for the "casual" difficulty. */
export function randomMove(board: Board): number {
  const open = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  // Deterministic-ish: pick the middle-most available to avoid Math.random here.
  return open.sort((a, b) => Math.abs(4 - a) - Math.abs(4 - b))[0] ?? -1;
}
