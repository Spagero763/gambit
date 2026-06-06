"use client";

/** Client helpers that talk to the authoritative match server. */

export async function registerMatch(args: {
  id: bigint;
  game: string;
  chainId: number;
  stake: bigint;
  creator: string;
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
    body: JSON.stringify({ id: id.toString(), player, move }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "move failed");
  return data;
}
