"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatUnits } from "viem";
import { supabase } from "@/lib/supabase";
import { symbolForToken, decimalsForToken } from "@/lib/tokens";
import { listTournaments, TournamentRow } from "@/lib/tournamentClient";
import { SkeletonList } from "@/components/Skeleton";
import { cn } from "@/lib/cn";

const FEE = 0.05;

// Names for the games a tournament can be played in. Creating one is not in this
// release (MiniPay review item 4), so this is only used to label the rows people
// can still join.
const CUP_GAMES = [
  { slug: "blocks", name: "Block Blitz" },
  { slug: "chess", name: "Chess" },
  { slug: "whot", name: "Naija Whot" },
  { slug: "tic-tac-toe", name: "Tic-Tac-Toe" },
  { slug: "snakes", name: "Snakes & Ladders" },
];

const STATUS_STYLE: Record<string, string> = {
  open: "bg-teal/15 text-teal",
  active: "bg-amber/15 text-amber",
  settling: "bg-amber/15 text-amber",
  settled: "bg-white/10 text-ink-dim",
  cancelled: "bg-rose/15 text-rose",
};

/**
 * Tournaments you can join. Two things are deliberately absent:
 *  - Creating a tournament, held back for a later release (review item 4). The
 *    server route still exists so anything already running settles normally.
 *  - The free Weekly Cup, pulled because there is no prize funding behind it and
 *    a cup that cannot pay is worse than no cup. Settling past weeks still works
 *    from the ops panel, so nobody who already placed goes unpaid.
 */
export function Tournaments() {
  const [rows, setRows] = useState<TournamentRow[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows(await listTournaments());
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    // realtime nudges from cup rows changing; poll becomes a slow safety net
    const channel = supabase
      ?.channel("cups-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => refresh())
      .subscribe();
    const t = setInterval(refresh, 15000);
    return () => {
      if (channel) supabase?.removeChannel(channel);
      clearInterval(t);
    };
  }, [refresh]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-4 lg:max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber/15 text-amber">
          <Trophy className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-ink-dim">Knockout rounds. Survive the cuts to the final. Top 3 split the pot 50/30/20.</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Join a tournament</p>
        {rows === null ? (
          <SkeletonList rows={3} />
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-line bg-void-800 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-ink">No tournaments running right now</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] leading-snug text-ink-dim">
              Check back soon. In the meantime you can play a staked 1v1 against a real person for the same money.
            </p>
            <Link href="/" className="btn-primary mt-4 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm shadow-glow">
              Pick a game <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => (
              <Card key={r.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ row }: { row: TournamentRow }) {
  const sym = symbolForToken(row.token);
  const dec = row.decimals ?? decimalsForToken(row.token);
  const stake = Number(formatUnits(BigInt(row.stake), dec));
  const pot = stake * row.capacity * (1 - FEE);
  return (
    <Link href={`/tournament/${row.id}`} className="block">
      <motion.div whileTap={{ scale: 0.99 }} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-void-800 px-4 py-3.5 transition-colors hover:border-line-strong">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              {CUP_GAMES.find((g) => g.slug === row.game)?.name ?? row.game}
            </span>
            {row.format === "bracket" && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-bright">Knockout</span>
            )}
            {row.format === "table" && (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-bright">Table</span>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[row.status] ?? "bg-white/10 text-ink-dim")}>{row.status}</span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-faint">
            <span className="nums">{stake.toFixed(2)} {sym} entry</span>
            <span>·</span>
            <span className="nums inline-flex items-center gap-1"><Users className="h-3 w-3" /> {row.capacity} max</span>
            <span>·</span>
            <span className="nums text-teal">{pot.toFixed(2)} {sym} pool</span>
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" />
      </motion.div>
    </Link>
  );
}
