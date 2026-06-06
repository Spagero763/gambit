// Server-authoritative snakes & ladders. The server rolls the dice so a client
// can never pick its own number — essential once cUSD is on the line.
import { jumpTo } from "@/lib/games/snakesLayout";

export interface SnakesState {
  pos: Record<string, number>; // address -> square (1..100)
  order: string[]; // [creator, opponent]
  turn: string; // address to roll
  dice: number; // last roll (for the client to animate)
}

export function newSnakes(creator: string, opponent: string): SnakesState {
  const c = creator.toLowerCase();
  const o = opponent.toLowerCase();
  return { pos: { [c]: 1, [o]: 1 }, order: [c, o], turn: c, dice: 1 };
}

export interface SnakesOutcome {
  state: SnakesState;
  finished: boolean;
  winner: string | null;
  draw: boolean;
}

/** Roll for `player`. Throws if it isn't their turn. Must roll exactly onto 100. */
export function applySnakesRoll(state: SnakesState, player: string): SnakesOutcome {
  const addr = player.toLowerCase();
  if (state.turn !== addr) throw new Error("Not your turn");
  if (!(addr in state.pos)) throw new Error("Not a player");

  const roll = 1 + Math.floor(Math.random() * 6); // authoritative server RNG
  const from = state.pos[addr];
  const landing = from + roll;
  const dest = landing <= 100 ? jumpTo(landing) : from; // overshoot = stay

  const pos = { ...state.pos, [addr]: dest };
  const other = state.order.find((a) => a !== addr) ?? addr;
  const win = dest >= 100;
  const newState: SnakesState = { ...state, pos, dice: roll, turn: win ? addr : other };

  return win
    ? { state: newState, finished: true, winner: addr, draw: false }
    : { state: newState, finished: false, winner: null, draw: false };
}
