"use client";

import { getToken } from "@/lib/profile";

/** Client helpers for the free Weekly Cup (see /api/cup). */

export interface CupEntry {
  address: string;
  score: number;
}

export interface CupWinner {
  address: string;
  amount: number;
  tx: string | null;
}

export interface CupView {
  week: string;
  open: boolean;
  seed: number;
  startsAt: number;
  endsAt: number;
  prize: number;
  split: number[];
  entries: CupEntry[];
  count: number;
  me: CupEntry | null;
  joined: boolean;
  last: { week: string; status: string; winners: CupWinner[] | null } | null;
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/cup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function fetchCup(address?: string): Promise<CupView> {
  const q = address ? `?address=${address.toLowerCase()}` : "";
  const res = await fetch(`/api/cup${q}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data;
}

export async function joinCup(address: string): Promise<{ ok: boolean }> {
  return post({ action: "join", address, auth: getToken(address) });
}

export async function submitCupScore(address: string, score: number): Promise<{ ok: boolean; best: number }> {
  return post({ action: "score", address, score, auth: getToken(address) });
}

/** Fire-and-forget: pay out LAST week if it hasn't been settled yet. */
export function settleLastCup(): void {
  void fetch("/api/cup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "settle" }),
  }).catch(() => {});
}
