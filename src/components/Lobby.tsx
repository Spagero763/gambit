"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { RefreshCw, Plus, Swords, Coins } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { GAMES } from "@/lib/games";
import { GameCover } from "@/components/art/GameCover";
import { symbolForToken } from "@/lib/tokens";
import { cn } from "@/lib/cn";

const GAME = Object.fromEntries(GAMES.map((g) => [g.slug, g]));

interface Room {
  id: number;
  game: string;
  stake: string;
  creator: string;
  chain_id: number;
  created_at: string;
  token: string | null;
  decimals: number | null;
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function Lobby() {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { address } = useAccount();
  const me = address?.toLowerCase();

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
    setRooms((data as Room[]) ?? []);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live games</h1>
          <p className="mt-1 text-sm text-ink-dim">Open staked rooms waiting for an opponent.</p>
        </div>
        <button
          onClick={refresh}
          aria-label="Refresh"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <Link
        href="/play/tic-tac-toe"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-void-800 px-4 py-3.5 transition-colors hover:border-line-strong"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-void-600 text-teal">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Create a staked room</p>
          <p className="text-[12px] text-ink-faint">Set your stake and share, or wait for a challenger.</p>
        </div>
      </Link>

      {rooms === null ? (
        <p className="mt-4 rounded-2xl border border-line bg-void-700 px-4 py-8 text-center text-sm text-ink-faint">Loading rooms…</p>
      ) : rooms.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-void-700 px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-teal">
            <Swords className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">No open rooms right now.</p>
          <p className="mt-1 text-[12px] text-ink-faint">Be the first — create one above and a challenger can join.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rooms.map((r) => {
            const g = GAME[r.game];
            const stake = Number(formatUnits(BigInt(r.stake || "0"), r.decimals ?? 18));
            const sym = symbolForToken(r.token);
            const mine = r.creator?.toLowerCase() === me;
            return (
              <li key={r.id}>
                <Link
                  href={`/play/${r.game}?room=${r.id}&stake=${stake}&token=${r.token ?? ""}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-void-700 p-3 shadow-card transition-colors hover:border-line-strong"
                >
                  <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line">
                    {g ? <GameCover art={g.art} className="h-full w-full" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{g?.name ?? r.game}</p>
                    <p className="truncate text-[11px] text-ink-faint">
                      {mine ? "Your room" : short(r.creator)} · #{r.id} · {relTime(r.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="nums flex items-center gap-1 text-sm font-semibold text-teal">
                      <Coins className="h-3.5 w-3.5" />
                      {stake.toFixed(2)} <span className="text-[10px] text-ink-faint">{sym}</span>
                    </p>
                    <span className="text-[10px] text-ink-faint">{mine ? "open" : "join →"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
