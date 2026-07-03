"use client";

import type { Card, Shape } from "@/lib/games/whot";
import { getToken } from "@/lib/profile";

/** Client helpers that talk to the authoritative match server. */

export async function registerMatch(args: {
  id: bigint;
  game: string;
  chainId: number;
  stake: bigint;
  creator: string;
  token?: string;
  decimals?: number;
}) {
  const res = await fetch("/api/match/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: args.id.toString(),
      game: args.game,
      chainId: args.chainId,
      stake: args.stake.toString(),
      creator: args.creator,
      token: args.token,
      decimals: args.decimals,
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "register failed");
  return res.json();
}

export async function joinServerMatch(id: bigint, opponent: string) {
  const res = await fetch("/api/match/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString(), opponent }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "join failed");
  return res.json();
}

export interface MoveResult {
  ok: boolean;
  finished: boolean;
  winner?: string | null;
  draw?: boolean;
  settled?: boolean;
  settleTx?: string | null;
  state?: unknown;
  error?: string;
}

export async function submitMove(id: bigint, player: string, move: unknown): Promise<MoveResult> {
  const res = await fetch("/api/match/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString(), player, move, token: getToken(player) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "move failed");
  return data;
}

/* ---------------- Whot (hidden-hand) helpers ---------------- */

export interface WhotView {
  ok: boolean;
  status: string;
  winner: string | null;
  settleTx: string | null;
  settleError: string | null;
  chainId: number;
  turn: string | null;
  top: Card | null;
  active: Shape | null;
  pending: { amount: number; num: number } | null;
  counts: Record<string, number>;
  order: string[];
  finished: string[]; // placement order on survival tables (1st, 2nd, …)
  yourHand: Card[];
  updatedAt: string | null;
}

export type WhotAction = { type: "play"; cardId: string; called?: Shape } | { type: "draw" };

export async function fetchWhot(id: bigint, player: string): Promise<WhotView> {
  const res = await fetch(`/api/match/whot?id=${id.toString()}&player=${player}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "fetch failed");
  return data;
}

export async function whotAction(id: bigint, player: string, action: WhotAction): Promise<WhotView> {
  const res = await fetch("/api/match/whot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString(), player, action, token: getToken(player) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "move failed");
  return data;
}

/** Re-drive a stuck on-chain settlement (payout). */
export async function retrySettle(id: bigint): Promise<{ settled: boolean; settleTx?: string; error?: string }> {
  const res = await fetch("/api/match/settle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString() }),
  });
  return res.json();
}

/** Win-by-forfeit window: if the player to move is idle this long, the
 *  opponent may claim the win. Mirrors the server's TURN_TIMEOUT_MS. */
export const TURN_TIMEOUT_MS = 120_000;

/** Claim the win when the opponent has abandoned (timed out). */
export async function claimWin(id: bigint, player: string): Promise<{ ok: boolean; settled?: boolean; error?: string; remainingMs?: number }> {
  const res = await fetch("/api/match/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString(), player }),
  });
  return res.json();
}

/** Resign: concede the match, opponent wins the pot instantly. Authenticated. */
export async function resignMatch(id: bigint, player: string): Promise<{ ok: boolean; settled?: boolean; winner?: string; error?: string }> {
  const res = await fetch("/api/match/resign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toString(), player, token: getToken(player) }),
  });
  return res.json();
}
