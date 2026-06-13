"use client";

import { getToken } from "@/lib/profile";

/** Client helpers for the authoritative tournament server. */

export interface TournamentRow {
  id: number;
  game: string;
  format: "score" | "bracket" | "table";
  chain_id: number;
  token: string | null;
  decimals: number;
  stake: string;
  capacity: number;
  seed: number;
  round: number;
  creator: string;
  status: "open" | "active" | "settling" | "settled" | "cancelled";
  winners: string[] | null;
  settle_tx: string | null;
  settle_error: string | null;
  created_at: string;
}

/** A bracket sub-match (semi/bronze/final) — a real 1v1 in `matches`. */
export interface BracketMatch {
  id: number;
  game: string;
  creator: string;
  opponent: string | null;
  status: string;
  winner: string | null;
  turn: string | null;
  bracket_slot: number; // 0/1 = semis, 2 = bronze, 3 = final, 9 = survival table
  updated_at: string;
  // present on the survival table (slot 9): public Whot state
  state?: {
    order?: string[];
    counts?: Record<string, number>;
    finished?: string[];
    turn?: string | null;
  };
}

export interface TournamentPlayer {
  address: string;
  score: number | null;
  round_score: number | null;
  eliminated_round: number | null;
  submitted_at?: string | null;
}

/** Every round plays a different (deterministic) board. */
export function roundSeed(seed: number, round: number) {
  return seed + (round - 1) * 9973;
}

/** Human stage name for the current field size. */
export function stageName(aliveCount: number) {
  if (aliveCount <= 3) return "Final";
  if (aliveCount <= 5) return "Semi-final";
  return "Quarter-final";
}

export interface TournamentView {
  tournament: TournamentRow;
  players: TournamentPlayer[];
  bracket?: BracketMatch[];
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/tournament", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function registerTournament(args: {
  id: bigint;
  game: string;
  format?: "score" | "bracket" | "table";
  chainId: number;
  stake: bigint;
  capacity: number;
  creator: string;
  token?: string;
  decimals?: number;
}): Promise<{ ok: boolean; seed: number }> {
  return post({
    action: "register",
    id: args.id.toString(),
    game: args.game,
    format: args.format ?? "score",
    chainId: args.chainId,
    stake: args.stake.toString(),
    capacity: args.capacity,
    creator: args.creator,
    token: args.token,
    decimals: args.decimals,
    auth: getToken(args.creator),
  });
}

export async function joinTournament(id: bigint, address: string): Promise<{ ok: boolean; status: string; seed: number }> {
  return post({ action: "join", id: id.toString(), address, auth: getToken(address) });
}

export async function submitTournamentScore(id: bigint, address: string, score: number): Promise<{ ok: boolean; best: number; settled?: boolean }> {
  return post({ action: "score", id: id.toString(), address, score, auth: getToken(address) });
}

export async function settleTournamentNow(id: bigint): Promise<{ ok: boolean; settled?: boolean; winners?: string[]; settleTx?: string; error?: string; retryInMs?: number }> {
  return post({ action: "settle", id: id.toString() });
}

/** Reconcile the row to a cancellation/refund that already happened on-chain. */
export async function syncTournamentCancelled(id: bigint): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  return post({ action: "cancel", id: id.toString() });
}

/** Self-heal an open cup from chain truth (import missed seats, start when full). */
export async function syncTournament(id: bigint): Promise<{ ok: boolean; status?: string }> {
  return post({ action: "sync", id: id.toString() });
}

export async function fetchTournament(id: bigint): Promise<TournamentView> {
  const res = await fetch(`/api/tournament?id=${id.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Not found");
  return data;
}

export async function listTournaments(): Promise<TournamentRow[]> {
  const res = await fetch(`/api/tournament`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data.tournaments ?? [];
}
