// Server-authoritative tic-tac-toe rules. The server owns the board so a
// client can never forge a result.

export type TCell = "X" | "O" | null;
export interface TttState {
  board: TCell[]; // length 9
  marks: Record<string, "X" | "O">; // address -> mark
  turn: string; // address to move
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function newTtt(creator: string, opponent: string): TttState {
  return {
    board: Array(9).fill(null),
    marks: { [creator.toLowerCase()]: "X", [opponent.toLowerCase()]: "O" },
    turn: creator.toLowerCase(),
  };
}

export interface TttOutcome {
  state: TttState;
  finished: boolean;
  winner: string | null; // address, or null for draw/none
  draw: boolean;
}

/** Apply a move. Throws on any illegal action so the server stays authoritative. */
export function applyTtt(state: TttState, player: string, cell: number): TttOutcome {
  const addr = player.toLowerCase();
  if (state.turn !== addr) throw new Error("Not your turn");
  if (!(addr in state.marks)) throw new Error("Not a player");
  if (cell < 0 || cell > 8 || state.board[cell]) throw new Error("Illegal cell");

  const board = state.board.slice();
  board[cell] = state.marks[addr];

  const winnerMark = winner(board);
  const others = Object.keys(state.marks).filter((a) => a !== addr);
  const next = others[0];

  const newState: TttState = { ...state, board, turn: next };

  if (winnerMark) {
    return { state: newState, finished: true, winner: addr, draw: false };
  }
  if (board.every((c) => c)) {
    return { state: newState, finished: true, winner: null, draw: true };
  }
  return { state: newState, finished: false, winner: null, draw: false };
}

function winner(board: TCell[]): TCell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}
