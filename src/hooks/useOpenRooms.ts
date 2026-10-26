"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Room {
  id: number;
  game: string;
  stake: string;
  creator: string;
  chain_id: number;
  created_at: string;
  token: string | null;
  decimals: number | null;
}

// Mirrors joinWindow() on the escrow (600s). A room older than this cannot be
// joined by anyone, so it has no business in a list of rooms to join.
export const JOIN_WINDOW_MS = 600 * 1000;

// The list re-reads often; the refund sweep doesn't need to. Every few
// minutes clears the backlog just as well.
let lastSweep = 0;
function askForRefunds() {
  if (Date.now() - lastSweep < 3 * 60 * 1000) return;
  lastSweep = Date.now();
  void fetch("/api/match/sweep").catch(() => {});
}

/** Staked rooms waiting for an opponent, live. `null` while the first read is in flight. */
export function useOpenRooms(channel = "open-rooms") {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setRooms([]);
      return;
    }
    setRefreshing(true);
    const { data } = await supabase
      .from("matches")
      .select("id,game,stake,creator,chain_id,created_at,token,decimals")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    // A room dies 10 minutes after it opens: the contract refuses further
    // joins, but the row stays "open" until something refunds it. Listing
    // those was a trap, so hide them and ask the server to hand stakes back.
    const rows = (data as Room[]) ?? [];
    const live = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < JOIN_WINDOW_MS);
    setRooms(live);
    if (live.length !== rows.length) askForRefunds();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
    // realtime: a room opening, filling or settling refreshes at once; the
    // poll is a slow safety net, and also ages rooms out of the window
    const ch = supabase
      ?.channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => refresh())
      .subscribe();
    const t = setInterval(refresh, 20000);
    return () => {
      if (ch) supabase?.removeChannel(ch);
      clearInterval(t);
    };
  }, [refresh, channel]);

  return { rooms, refresh, refreshing };
}

/** Seconds left to join, for a countdown. */
export function secondsLeft(room: Room) {
  return Math.max(0, Math.floor((new Date(room.created_at).getTime() + JOIN_WINDOW_MS - Date.now()) / 1000));
}
