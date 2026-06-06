// Server-authoritative chess rules. The server owns the FEN so a client can
// never forge a position or a result. chess.js validates every move.
import { Chess } from "chess.js";

export interface ChessState {
  fen: string;
  colors: Record<string, "w" | "b">; // address -> colour
  turn: string; // address to move
}

export function newChess(creator: string, opponent: string): ChessState {
  const c = new Chess();
  return {
    fen: c.fen(),
    colors: { [creator.toLowerCase()]: "w", [opponent.toLowerCase()]: "b" },
    turn: creator.toLowerCase(), // white (creator) moves first
  };
}

export interface ChessOutcome {
  state: ChessState;
  finished: boolean;
  winner: string | null; // address, or null for draw/none
  draw: boolean;
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

/** Apply a move. Throws on any illegal action so the server stays authoritative. */
export function applyChessMove(state: ChessState, player: string, move: ChessMove): ChessOutcome {
  const addr = player.toLowerCase();
  if (state.turn !== addr) throw new Error("Not your turn");
  const color = state.colors[addr];
  if (!color) throw new Error("Not a player");

  const c = new Chess(state.fen);
  if (c.turn() !== color) throw new Error("Not your turn");

  let res;
  try {
    res = c.move({ from: move.from, to: move.to, promotion: (move.promotion as any) || "q" });
  } catch {
    throw new Error("Illegal move");
  }
  if (!res) throw new Error("Illegal move");

  const next = Object.keys(state.colors).find((a) => a !== addr) ?? addr;
  const newState: ChessState = { fen: c.fen(), colors: state.colors, turn: next };

  if (c.isGameOver()) {
    // checkmate => the side to move is mated, so the mover (addr) wins
    if (c.isCheckmate()) return { state: newState, finished: true, winner: addr, draw: false };
    return { state: newState, finished: true, winner: null, draw: true };
  }
  return { state: newState, finished: false, winner: null, draw: false };
}
