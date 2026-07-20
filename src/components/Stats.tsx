"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { Users, Activity, Swords, Coins, Trophy, Flame, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { symbolForToken, decimalsForToken } from "@/lib/tokens";
import { GAMES } from "@/lib/games";
import { useProfiles, displayName } from "@/lib/profiles";
import { Skeleton } from "@/components/Skeleton";
import { Counter } from "@/components/Counter";
import { cn } from "@/lib/cn";

const ease = [0.22, 1, 0.36, 1] as const;

const NAME: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));
const FEE = 0.05;

interface MatchRow {
  game: string;
  stake: string;
  creator: string;
  opponent: string | null;
  winner: string | null;
  status: string;
  token: string | null;
  decimals: number | null;
  created_at: string;
}
interface ProfileRow {
  address: string;
  last_played: string | null;
  xp: number;
  streak: number;
}
/** Tournaments stake at the cup level, not on their bracket sub-matches. */
interface TournamentRow {
  id: number;
  stake: string;
  capacity: number;
  status: string;
  token: string | null;
  decimals: number | null;
}
interface TournamentPlayerRow {
  tournament_id: number;
  address: string;
}

/** A row only counts as staked if real money was put on it. */
const isStaked = (stake: string | null) => {
  try {
    return BigInt(stake || "0") > BigInt(0);
  } catch {
    return false;
  }
};

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
const money = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n < 10 ? 2 : 0));

export function Stats() {
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [tournaments, setTournaments] = useState<TournamentRow[] | null>(null);
  const [cupPlayers, setCupPlayers] = useState<TournamentPlayerRow[] | null>(null);

  useEffect(() => {
    if (!supabase) {
      setMatches([]);
      setProfiles([]);
      setTournaments([]);
      setCupPlayers([]);
      return;
    }
    let active = true;
    (async () => {
      const [m, p, t, tp] = await Promise.all([
        supabase!
          .from("matches")
          .select("game,stake,creator,opponent,winner,status,token,decimals,created_at")
          .in("status", ["active", "settling", "settled"])
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase!.from("profiles").select("address,last_played,xp,streak").limit(5000),
        // tournaments hold their stake on the cup row; their bracket sub-matches
        // are zero-stake, so cup money is invisible without this
        supabase!
          .from("tournaments")
          .select("id,stake,capacity,status,token,decimals")
          .in("status", ["active", "settling", "settled"])
          .limit(2000),
        // a player who only ever entered a cup still staked — their money is on
        // the cup, not on any match row
        supabase!.from("tournament_players").select("tournament_id,address").limit(5000),
      ]);
      if (!active) return;
      setMatches((m.data as MatchRow[]) ?? []);
      setProfiles((p.data as ProfileRow[]) ?? []);
      setTournaments((t.data as TournamentRow[]) ?? []);
      setCupPlayers((tp.data as TournamentPlayerRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const s = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const ms = matches ?? [];
    const ps = profiles ?? [];
    const ts = tournaments ?? [];
    const cps = cupPlayers ?? [];

    // Only rows with real money on them are "staked". Tournament bracket
    // sub-matches are zero-stake rows and must never be counted as staked
    // matches, or as stakers — the cup itself holds the stake.
    const stakedMatches = ms.filter((m) => isStaked(m.stake));

    const volume: Record<string, number> = {};
    const paid: Record<string, number> = {};
    const players = new Set<string>();
    let settled = 0;

    for (const m of stakedMatches) {
      const dec = m.decimals ?? decimalsForToken(m.token);
      const sym = symbolForToken(m.token);
      const stake = Number(formatUnits(BigInt(m.stake || "0"), dec));
      volume[sym] = (volume[sym] ?? 0) + stake * 2; // both seats
      if (m.creator) players.add(m.creator.toLowerCase());
      if (m.opponent) players.add(m.opponent.toLowerCase());
      if (m.status === "settled") {
        settled += 1;
        // a draw refunds both stakes rather than paying a winner, so it adds
        // to volume but never to "paid to winners"
        if (m.winner) paid[sym] = (paid[sym] ?? 0) + stake * 2 * (1 - FEE);
      }
    }

    // Cups: the pot is stake × capacity, and the top three share 95% of it.
    const stakedCups = ts.filter((t) => isStaked(t.stake));
    const stakedCupIds = new Set(stakedCups.map((t) => t.id));
    for (const t of stakedCups) {
      const dec = t.decimals ?? decimalsForToken(t.token);
      const sym = symbolForToken(t.token);
      const pot = Number(formatUnits(BigInt(t.stake || "0"), dec)) * (t.capacity || 0);
      volume[sym] = (volume[sym] ?? 0) + pot;
      if (t.status === "settled") {
        settled += 1;
        paid[sym] = (paid[sym] ?? 0) + pot * (1 - FEE);
      }
    }

    // Someone who only ever entered a cup is still a staker. Their bracket
    // sub-matches are zero-stake rows, so they'd be invisible without this.
    for (const cp of cps) {
      if (stakedCupIds.has(cp.tournament_id) && cp.address) players.add(cp.address.toLowerCase());
    }

    const dau = ps.filter((p) => p.last_played === today).length;
    const topStreak = ps.reduce((mx, p) => Math.max(mx, p.streak || 0), 0);
    const recent = stakedMatches.filter((m) => m.status === "settled").slice(0, 8);

    return {
      totalPlayers: ps.length || players.size,
      stakedPlayers: players.size,
      dau,
      matches: stakedMatches.length + stakedCups.length,
      settled,
      topStreak,
      volume,
      paid,
      recent,
    };
  }, [matches, profiles, tournaments, cupPlayers]);

  // names for the recent-results winners (people, never 0x)
  const winnerProfiles = useProfiles(s.recent.filter((m) => m.winner).map((m) => m.winner!));

  const loading = matches === null || profiles === null;
  const volEntries = Object.entries(s.volume);
  const paidEntries = Object.entries(s.paid);

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2 lg:max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-dim">
        <ShieldCheck className="h-4 w-4 shrink-0 text-teal" />
        Real activity, settled on Celo.
        <a
          href="https://celoscan.io/address/0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05"
          target="_blank"
          rel="noreferrer"
          className="text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
        >
          Verify it yourself
        </a>
      </p>

      {loading ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" role="status" aria-label="Loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-void-800 p-4" style={{ opacity: 1 - i * 0.1 }}>
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="mt-3 h-5 w-14" />
              <Skeleton className="mt-1.5 h-2.5 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card icon={Users} label="Players" value={s.totalPlayers} i={0} />
            <Card icon={Activity} label="Active today" value={s.dau} accent="text-teal" i={1} />
            <Card icon={Swords} label="Staked matches" value={s.matches} i={2} />
            <Card icon={Trophy} label="Settled" value={s.settled} i={3} />
            <Card icon={Flame} label="Top streak" value={s.topStreak} accent="text-amber" i={4} />
            <Card icon={Users} label="Stakers" value={s.stakedPlayers} i={5} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <TokenCard label="Volume staked" entries={volEntries} />
            <TokenCard label="Paid to winners" entries={paidEntries} accent="text-teal" />
          </div>

          <h2 className="mb-3 mt-7 text-[15px] font-semibold tracking-tight">Recent results</h2>
          {s.recent.length === 0 ? (
            <p className="rounded-2xl border border-line bg-void-700 px-4 py-8 text-center text-sm text-ink-faint">
              No settled staked matches yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {s.recent.map((m, i) => {
                const dec = m.decimals ?? decimalsForToken(m.token);
                const stake = Number(formatUnits(BigInt(m.stake || "0"), dec));
                const sym = symbolForToken(m.token);
                const draw = !m.winner;
                return (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-line bg-void-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{NAME[m.game] ?? m.game}</p>
                      <p className="text-[11px] text-ink-faint">
                        {draw ? "Draw · refunded" : `${displayName(m.winner!, winnerProfiles[m.winner!.toLowerCase()])} won`} · {relTime(m.created_at)} ago
                      </p>
                    </div>
                    <p className="nums text-sm font-semibold text-teal">
                      {(draw ? stake : stake * 2 * (1 - FEE)).toFixed(2)} <span className="text-[10px] text-ink-faint">{sym}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Card({ icon: Icon, label, value, accent, i = 0 }: { icon: any; label: string; value: number; accent?: string; i?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease, delay: i * 0.06 }}
      className="rounded-2xl border border-line bg-void-700 p-4 shadow-card"
    >
      <Icon className="h-4 w-4 text-ink-faint" />
      <p className={cn("nums mt-2 text-2xl font-semibold tracking-tight", accent ?? "text-ink")}>
        <Counter to={value} />
      </p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{label}</p>
    </motion.div>
  );
}

function TokenCard({ label, entries, accent }: { label: string; entries: [string, number][]; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void-700 p-4 shadow-card">
      <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
        <Coins className="h-3.5 w-3.5" /> {label}
      </span>
      {entries.length === 0 ? (
        <p className="nums mt-2 text-2xl font-semibold text-ink">0</p>
      ) : (
        <div className="mt-2 space-y-0.5">
          {entries.map(([sym, n]) => (
            <p key={sym} className={cn("nums text-xl font-semibold tracking-tight", accent ?? "text-ink")}>
              {money(n)} <span className="text-[11px] text-ink-faint">{sym}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
