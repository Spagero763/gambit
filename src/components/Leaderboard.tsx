"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { aggregateStandings, Standing } from "@/lib/leaderboard";
import { cn } from "@/lib/cn";

type Sort = "earnings" | "wins";
type Range = "week" | "all";

interface Raw {
  creator: string;
  opponent: string | null;
  winner: string | null;
  stake: string;
  created_at: string;
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Leaderboard() {
  const [sort, setSort] = useState<Sort>("earnings");
  const [range, setRange] = useState<Range>("all");
  const [raw, setRaw] = useState<Raw[] | null>(null);
  const { address } = useAccount();
  const me = address?.toLowerCase();

  useEffect(() => {
    if (!supabase) {
      setRaw([]);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("matches")
        .select("creator,opponent,winner,stake,created_at")
        .in("status", ["settling", "settled"])
        .limit(1000);
      if (active) setRaw((data as Raw[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo<Standing[]>(() => {
    if (!raw) return [];
    const cutoff = Date.now() - 7 * 86400 * 1000;
    const filtered = range === "week" ? raw.filter((m) => new Date(m.created_at).getTime() >= cutoff) : raw;
    const standings = aggregateStandings(filtered);
    standings.sort((a, b) => (sort === "earnings" ? b.net - a.net : b.wins - a.wins));
    return standings.slice(0, 50);
  }, [raw, range, sort]);

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-ink-dim">Top players by settled staked matches.</p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-void-800 p-1">
        {(
          [
            { id: "earnings", label: "Top earners" },
            { id: "wins", label: "Most wins" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSort(t.id)}
            className="relative rounded-lg py-2 text-sm font-medium"
          >
            {sort === t.id && (
              <motion.span
                layoutId="lbTab"
                className="absolute inset-0 rounded-lg bg-void-600"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className={cn("relative", sort === t.id ? "text-ink" : "text-ink-faint")}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {(
          [
            { id: "all", label: "All-time" },
            { id: "week", label: "This week" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              range === r.id ? "border-line-strong bg-void-600 text-ink" : "border-line text-ink-faint"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {raw === null ? (
        <p className="mt-4 rounded-2xl border border-line bg-void-700 px-4 py-8 text-center text-sm text-ink-faint">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-void-700 px-4 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-teal">
            <Trophy className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">No ranked matches yet.</p>
          <p className="mt-1 text-[12px] text-ink-faint">Win a staked 1v1 to claim the top spot.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.ul
            key={sort + range}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-2"
          >
            {rows.map((row, i) => (
              <Row key={row.handle} row={row} rank={i + 1} sort={sort} isMe={row.handle === me} />
            ))}
          </motion.ul>
        </AnimatePresence>
      )}
    </section>
  );
}

function Row({ row, rank, sort, isMe }: { row: Standing; rank: number; sort: Sort; isMe: boolean }) {
  const top = rank <= 3;
  const medal = ["text-amber", "text-ink-dim", "text-[#c08457]"][rank - 1];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.3) }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-3",
        isMe ? "border-teal/40 bg-teal/[0.06]" : "border-line bg-void-800"
      )}
    >
      <div className="grid w-6 place-items-center">
        <span className={cn("nums font-mono text-sm font-semibold", top ? medal : "text-ink-faint")}>{rank}</span>
      </div>

      <span className="grid h-9 w-9 place-items-center rounded-lg bg-void-600 text-[11px] font-semibold text-ink-dim">
        {row.handle.slice(2, 4).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-mono text-[13px] font-medium text-ink">
          {short(row.handle)} {isMe && <span className="text-teal">· you</span>}
        </p>
        <p className="text-[11px] text-ink-faint">
          {row.wins}W · {row.losses}L
        </p>
      </div>

      <div className="text-right">
        {sort === "earnings" ? (
          <p className={cn("nums text-sm font-semibold", row.net >= 0 ? "text-teal" : "text-rose")}>
            {row.net >= 0 ? "+" : ""}
            {row.net.toFixed(2)} <span className="text-[10px] text-ink-faint">cUSD</span>
          </p>
        ) : (
          <p className="nums text-sm font-semibold text-ink">
            {row.wins} <span className="text-[10px] text-ink-faint">wins</span>
          </p>
        )}
      </div>
    </motion.li>
  );
}
