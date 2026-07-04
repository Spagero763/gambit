"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Timer, Play, Swords } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { weekStart, weekEnd } from "@/lib/scores";
import { cn } from "@/lib/cn";

interface ScoreRow {
  address: string;
  score: number;
  created_at: string;
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

export function Events() {
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const ends = useMemo(() => weekEnd(), []);
  const left = useCountdown(ends);

  useEffect(() => {
    if (!supabase) {
      setRows([]);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("scores")
        .select("address,score,created_at")
        .eq("game", "blocks")
        .gte("created_at", weekStart().toISOString())
        .order("score", { ascending: false })
        .limit(1000);
      if (active) setRows((data as ScoreRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const standings = useMemo(() => {
    const best = new Map<string, number>();
    for (const r of rows ?? []) {
      const a = r.address.toLowerCase();
      if (!best.has(a) || r.score > best.get(a)!) best.set(a, r.score);
    }
    return Array.from(best.entries()).map(([address, score]) => ({ address, score })).sort((a, b) => b.score - a.score);
  }, [rows]);

  const myRank = me ? standings.findIndex((s) => s.address === me) : -1;
  const myBest = myRank >= 0 ? standings[myRank].score : 0;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
      <p className="mt-1 text-sm text-ink-dim">Compete on a fresh challenge every week.</p>

      {/* the active event */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-void-700 shadow-card">
        <div className="bg-gradient-to-br from-rose/15 to-transparent p-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-rose/40 bg-rose/10 px-2.5 py-1 text-[11px] font-semibold text-rose">
              This week
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-dim">
              <Timer className="h-3.5 w-3.5" /> resets in {left}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Block Blitz · Weekly Showdown</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
            Highest single-game score wins the week. Free to enter — connect your wallet to put your score on the board.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/play/blocks" className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm shadow-glow">
              <Play className="h-4 w-4 fill-void" /> Play now
            </Link>
            {me && (
              <span className="text-[13px] text-ink-dim">
                Your best: <span className="nums font-semibold text-ink">{myBest.toLocaleString()}</span>
                {myRank >= 0 && <span className="text-ink-faint"> · rank #{myRank + 1}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      <h3 className="mb-3 mt-7 text-[15px] font-semibold tracking-tight">Standings</h3>
      {rows === null ? (
        <p className="rounded-2xl border border-line bg-void-700 px-4 py-8 text-center text-sm text-ink-faint">Loading…</p>
      ) : standings.length === 0 ? (
        <div className="rounded-2xl border border-line bg-void-700 px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-rose">
            <Trophy className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">No scores yet this week.</p>
          <p className="mt-1 text-[12px] text-ink-faint">Be the first. Play Block Blitz to claim the top spot.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {standings.slice(0, 50).map((s, i) => {
            const isMe = s.address === me;
            const medal = ["text-amber", "text-ink-dim", "text-[#c08457]"][i];
            return (
              <li
                key={s.address}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-3",
                  isMe ? "border-teal/40 bg-teal/[0.06]" : "border-line bg-void-800"
                )}
              >
                <div className="grid w-6 place-items-center">
                  <span className={cn("nums font-mono text-sm font-semibold", i < 3 ? medal : "text-ink-faint")}>{i + 1}</span>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-void-600 text-[11px] font-semibold text-ink-dim">
                  {s.address.slice(2, 4).toUpperCase()}
                </span>
                <p className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-ink">
                  {short(s.address)} {isMe && <span className="text-teal">· you</span>}
                </p>
                <p className="nums text-sm font-semibold text-ink">{s.score.toLocaleString()}</p>
              </li>
            );
          })}
        </ul>
      )}

      {/* coming next */}
      <div className="mt-6 flex gap-3 rounded-2xl border border-dashed border-line bg-void-800 p-4">
        <Swords className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" />
        <div>
          <p className="text-sm font-semibold text-ink">More formats coming</p>
          <p className="mt-0.5 text-[12px] text-ink-dim">Staked knockout brackets and per-game weekly ladders are on the way.</p>
        </div>
      </div>
    </section>
  );
}
