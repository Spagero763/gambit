"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, UserPen, Flame } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { aggregateStandings, Standing } from "@/lib/leaderboard";
import { useProfiles, displayName, avatarHex, shortAddr, PublicProfile } from "@/lib/profiles";
import { useProfile } from "@/lib/profile";
import { levelInfo } from "@/lib/progress";
import { rankForXp } from "@/lib/rank";
import { RankBadge } from "@/components/RankBadge";
import { SkeletonRows } from "@/components/Skeleton";
import { tokensFor } from "@/lib/tokens";
import { ACTIVE_CHAIN_ID } from "@/lib/wagmi";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/cn";

type Sort = "earnings" | "wins" | "points";
type Range = "week" | "all";

interface Raw {
  creator: string;
  opponent: string | null;
  winner: string | null;
  stake: string;
  created_at: string;
  decimals: number | null;
  token: string | null;
}

interface PointsRow {
  address: string;
  name: string | null;
  avatar: string;
  avatar_image: string | null;
  xp: number;
  streak: number;
}

const TABS = [
  { id: "earnings", label: "Top earners" },
  { id: "wins", label: "Most wins" },
  { id: "points", label: "Points" },
] as const;

export function Leaderboard() {
  const [sort, setSort] = useState<Sort>("earnings");
  const [range, setRange] = useState<Range>("all");
  const [raw, setRaw] = useState<Raw[] | null>(null);
  const [points, setPoints] = useState<PointsRow[] | null>(null);
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const tokens = tokensFor(ACTIVE_CHAIN_ID);
  const [tokenAddr, setTokenAddr] = useState(tokens[0].address.toLowerCase());
  const tokenSym = tokens.find((t) => t.address.toLowerCase() === tokenAddr)?.symbol ?? "USDm";

  // staked matches (earnings / wins boards)
  useEffect(() => {
    if (!supabase) {
      setRaw([]);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("matches")
        .select("creator,opponent,winner,stake,created_at,decimals,token")
        .in("status", ["settling", "settled"])
        .limit(1000);
      if (active) setRaw((data as Raw[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  // points board — every profile by XP (free + staked players alike)
  useEffect(() => {
    if (sort !== "points" || points !== null || !supabase) return;
    let active = true;
    (async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("address,name,avatar,avatar_image,xp,streak")
        .gt("xp", 0)
        .order("xp", { ascending: false })
        .limit(50);
      if (active) setPoints((data as PointsRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [sort, points]);

  const rows = useMemo<Standing[]>(() => {
    if (!raw) return [];
    const cutoff = Date.now() - 7 * 86400 * 1000;
    const usdm = tokens[0].address.toLowerCase();
    // one token at a time — you can't meaningfully add G$ and USDm into one
    // "earnings" number. Legacy matches predate the token column → treat as USDm.
    const filtered = raw.filter((m) => {
      const t = (m.token ?? "").toLowerCase();
      const sameToken = t === tokenAddr || (tokenAddr === usdm && t === "");
      if (!sameToken) return false;
      if (range === "week" && new Date(m.created_at).getTime() < cutoff) return false;
      return true;
    });
    const standings = aggregateStandings(filtered);
    standings.sort((a, b) => (sort === "wins" ? b.wins - a.wins : b.net - a.net));
    return standings.slice(0, 50);
  }, [raw, range, sort, tokenAddr, tokens]);

  const profiles = useProfiles(rows.map((r) => r.handle));
  const { profile: myProfile, loading: profileLoading } = useProfile();
  const needsName = !!address && !profileLoading && !myProfile?.name;
  const isPoints = sort === "points";

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-ink-dim">
        {isPoints ? "Top players by XP, earned just by playing." : "Top players by settled staked matches."}
      </p>

      {needsName && (
        <Link
          href="/profile"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-teal/35 bg-teal/[0.07] px-4 py-3 transition-colors hover:border-teal/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
            <UserPen className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Claim your player name</span>
            <span className="block text-[12px] text-ink-dim">Set a name and photo so the board shows you, not your 0x address.</span>
          </span>
        </Link>
      )}

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-void-800 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setSort(t.id)} className="relative rounded-lg py-2 text-sm font-medium">
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

      {/* week/all-time only applies to the money boards */}
      {!isPoints && (
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
      )}

      {/* which token's earnings — USDm / USDC / G$ are separate boards */}
      {!isPoints && (
        <div className="mt-2 flex gap-2">
          {tokens.map((t) => {
            const active = tokenAddr === t.address.toLowerCase();
            return (
              <button
                key={t.address}
                onClick={() => setTokenAddr(t.address.toLowerCase())}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "border-teal/50 bg-teal/[0.1] text-ink" : "border-line text-ink-faint"
                )}
              >
                {t.symbol}
              </button>
            );
          })}
        </div>
      )}

      {isPoints ? (
        points === null ? (
          <Loading />
        ) : points.length === 0 ? (
          <Empty title="No points yet." sub="Play a match or claim a daily quest to get on the board." />
        ) : (
          <ul className="mt-4 space-y-2">
            {points.map((p, i) => (
              <PointsRowItem key={p.address} p={p} rank={i + 1} isMe={p.address.toLowerCase() === me} />
            ))}
          </ul>
        )
      ) : raw === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="No ranked matches yet." sub="Win a staked 1v1 to claim the top spot." />
      ) : (
        <AnimatePresence mode="wait">
          <motion.ul key={sort + range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {rows.map((row, i) => (
              <Row key={row.handle} row={row} rank={i + 1} sort={sort} isMe={row.handle === me} profile={profiles[row.handle.toLowerCase()]} unit={tokenSym} />
            ))}
          </motion.ul>
        </AnimatePresence>
      )}
    </section>
  );
}

function Loading() {
  return <SkeletonRows rows={6} className="mt-4" />;
}
function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-void-700 px-4 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-void-600 text-teal">
        <Trophy className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm text-ink-dim">{title}</p>
      <p className="mt-1 text-[12px] text-ink-faint">{sub}</p>
    </div>
  );
}

const MEDAL = ["text-amber", "text-ink-dim", "text-[#c08457]"];

function PointsRowItem({ p, rank, isMe }: { p: PointsRow; rank: number; isMe: boolean }) {
  const lvl = levelInfo(p.xp);
  const tier = rankForXp(p.xp);
  const name = p.name?.trim() || shortAddr(p.address);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.3) }}
      className={cn("flex items-center gap-3 rounded-xl border px-3 py-3", isMe ? "border-teal/40 bg-teal/[0.06]" : "border-line bg-void-800")}
    >
      <div className="grid w-6 place-items-center">
        <span className={cn("nums font-mono text-sm font-semibold", rank <= 3 ? MEDAL[rank - 1] : "text-ink-faint")}>{rank}</span>
      </div>
      <Avatar image={p.avatar_image || undefined} color={avatarHex({ avatar: p.avatar } as PublicProfile)} name={name} size={36} rounded="rounded-lg" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn("truncate text-[13px] font-medium text-ink", !p.name?.trim() && "font-mono")}>
          {name} {isMe && <span className="text-teal">· you</span>}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <RankBadge rank={tier} size={15} />
          <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>
          <span>Lv {lvl.level}</span>
          {p.streak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber">
              <Flame className="h-3 w-3" /> {p.streak}
            </span>
          )}
        </p>
      </div>
      <p className="nums text-sm font-semibold text-ink">
        {p.xp.toLocaleString()} <span className="text-[10px] text-ink-faint">XP</span>
      </p>
    </motion.li>
  );
}

function Row({ row, rank, sort, isMe, profile, unit }: { row: Standing; rank: number; sort: Sort; isMe: boolean; profile?: PublicProfile; unit: string }) {
  const top = rank <= 3;
  const named = !!profile?.name?.trim();

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.3) }}
      className={cn("flex items-center gap-3 rounded-xl border px-3 py-3", isMe ? "border-teal/40 bg-teal/[0.06]" : "border-line bg-void-800")}
    >
      <div className="grid w-6 place-items-center">
        <span className={cn("nums font-mono text-sm font-semibold", top ? MEDAL[rank - 1] : "text-ink-faint")}>{rank}</span>
      </div>

      <Avatar image={profile?.avatar_image || undefined} color={avatarHex(profile)} name={displayName(row.handle, profile)} size={36} rounded="rounded-lg" />

      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn("truncate text-[13px] font-medium text-ink", !named && "font-mono")}>
          {displayName(row.handle, profile)} {isMe && <span className="text-teal">· you</span>}
        </p>
        <p className="text-[11px] text-ink-faint">
          {row.wins}W · {row.losses}L{named ? <span className="font-mono"> · {shortAddr(row.handle)}</span> : ""}
        </p>
      </div>

      <div className="text-right">
        {sort === "earnings" ? (
          <p className={cn("nums text-sm font-semibold", row.net >= 0 ? "text-teal" : "text-rose")}>
            {row.net >= 0 ? "+" : ""}
            {row.net.toFixed(2)} <span className="text-[10px] text-ink-faint">{unit}</span>
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
