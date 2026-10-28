"use client";

import type { Card, Shape } from "@/lib/games/whot";
import { getToken } from "@/lib/profile";
import { claimSession } from "@/lib/stakeProof";

/** Client helpers that talk to the authoritative match server. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A 401 means this phone has no live session; the stake on record can mint one, then it's sent again. */
export async function withSession(player: string, send: () => Promise<Response>): Promise<Response> {
  const res = await send();
  if (res.status !== 401 || !(await claimSession(player))) return res;
  return send();
}

/** POST with a few retries; 4xx other than 409 means the request itself is wrong. */
async function postRetry(url: string, body: unknown, tries: number) {
  let last = "request failed";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      last = data.error ?? last;
      if (res.status >= 400 && res.status < 500 && res.status !== 409 && res.status !== 429) break;
    } catch (e: any) {
      last = e?.message ?? last;
    }
    await sleep(1500 * (i + 1));
  }
  throw new Error(last);
}

/** Record a room the creator just opened on-chain; the server reads its terms from the escrow. */
export function registerMatch(args: { id: bigint; game: string; chainId: number; creator: string }) {
  return postRetry("/api/match/register", { id: args.id.toString(), game: args.game, chainId: args.chainId, creator: args.creator }, 4);
}

/** Start a match once both seats are filled on-chain. Safe for either player to call. */
export function joinServerMatch(id: bigint) {
  return postRetry("/api/match/join", { id: id.toString() }, 5);
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
  const res = await withSession(player, () =>
    fetch("/api/match/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id.toString(), player, move, token: getToken(player) }),
    })
  );
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
  stake: string | null;
  decimals: number;
  token: string | null;
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
  const res = await withSession(player, () =>
    fetch(`/api/match/whot?id=${id.toString()}&player=${player}`, {
      headers: { "x-gambit-token": getToken(player) ?? "" },
    })
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "fetch failed");
  return data;
}

export async function whotAction(id: bigint, player: string, action: WhotAction): Promise<WhotView> {
  const res = await withSession(player, () =>
    fetch("/api/match/whot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id.toString(), player, action, token: getToken(player) }),
    })
  );
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
  const res = await withSession(player, () =>
    fetch("/api/match/resign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id.toString(), player, token: getToken(player) }),
    })
  );
  return res.json();
}
