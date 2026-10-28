"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { RefreshCw, ShieldCheck, Share2 } from "lucide-react";
import { GAMES } from "@/lib/games";
import { GameArt } from "@/components/art/TileArt";
import { useOpenRooms, secondsLeft } from "@/hooks/useOpenRooms";
import { roomHref } from "@/components/LiveNow";
import { useProfiles, displayName } from "@/lib/profiles";
import { SkeletonList } from "@/components/Skeleton";
import { symbolForToken } from "@/lib/tokens";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const MONEY_GAMES = GAMES.filter((g) => g.mode === "1v1" && g.status === "live");
const NAME = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));

/**
 * Where money matches start: everyone waiting for an opponent right now, and
 * a room of your own in any game. Rooms only stay open for ten minutes, so the
 * list leads and the way to open one sits right under it.
 */
export function Lobby() {
  const { rooms, refresh, refreshing } = useOpenRooms("lobby-rooms");
  const profiles = useProfiles((rooms ?? []).map((r) => r.creator));
  const { address } = useAccount();
  const me = address?.toLowerCase();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2 lg:max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display text-[34px] font-extrabold leading-none text-ink">1v1 for money</h1>
          <p className="mt-2 text-[14px] text-ink-dim">Real people, one pot. Winner takes 95%, paid in seconds.</p>
        </div>
        <button onClick={refresh} aria-label="Refresh" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-dim">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <h2 className="mb-2.5 mt-7 flex items-center gap-2 text-[14px] font-bold uppercase tracking-[0.08em] text-ink-dim">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-teal" style={{ animation: "ring 1.6s cubic-bezier(0.23,1,0.32,1) infinite" }} />
          <span className="relative h-2 w-2 rounded-full bg-teal" />
        </span>
        Waiting for an opponent
        {rooms && rooms.length > 0 && <span className="nums normal-case tracking-normal text-ink-faint">· {rooms.length}</span>}
      </h2>

      {rooms === null ? (
        <SkeletonList rows={3} />
      ) : rooms.length === 0 ? (
        <div className="glass rounded-tile px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-ink">Nobody&apos;s waiting right now</p>
          <p className="mx-auto mt-1 max-w-xs text-[16px] leading-snug text-ink-faint">
            Open a room below and share the link. The first person to join plays you.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r, i) => {
            const stake = Number(formatUnits(BigInt(r.stake || "0"), r.decimals ?? 18));
            const mine = r.creator?.toLowerCase() === me;
            const mins = Math.max(1, Math.ceil(secondsLeft(r) / 60));
            return (
              <li key={r.id} className="enter" style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                <Link href={roomHref(r)} className="glass pressable flex items-center gap-3 rounded-tile p-2.5 pr-3">
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[14px] border border-white/10">
                    <GameArt slug={r.game} className="h-full w-full" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {NAME[r.game] ?? r.game}
                      <span className="nums ml-1.5 text-teal">
                        {stake.toFixed(2)} {symbolForToken(r.token)}
                      </span>
                    </p>
                    <p className="truncate text-[14px] text-ink-faint">
                      {mine ? "Your room" : displayName(r.creator, profiles[r.creator.toLowerCase()])} · #{r.id} · {mins} min left
                    </p>
                  </div>
                  <span className={buttonClass(mine ? "secondary" : "primary", "sm", "shrink-0 px-3.5")}>{mine ? "Open" : "Join"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2.5 mt-8 text-[14px] font-bold uppercase tracking-[0.08em] text-ink-dim">Open a room</h2>
      <div className="grid grid-cols-2 gap-3">
        {MONEY_GAMES.map((g) => (
          <Link key={g.slug} href={`/play/${g.slug}?mode=staked`} className="glass pressable relative block overflow-hidden rounded-tile">
            <div className="relative aspect-[16/10] overflow-hidden">
              <GameArt slug={g.slug} className="h-full w-full" />
            </div>
            <p className="display px-3.5 pb-3 pt-2 text-[16px] font-extrabold leading-tight text-ink">{g.name}</p>
          </Link>
        ))}
      </div>

      <div className="glass mt-6 flex items-start gap-3 rounded-tile p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal">
          <Share2 className="h-[18px] w-[18px]" />
        </span>
        <p className="text-[16px] leading-snug text-ink-dim">
          <span className="font-semibold text-ink">Fastest way to a match:</span> open a room, then tap Challenge a friend and send the link on WhatsApp.
        </p>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[14px] text-ink-faint">
        <ShieldCheck className="h-3.5 w-3.5" /> Both entries are locked in a contract until the game ends.
      </p>
    </section>
  );
}
