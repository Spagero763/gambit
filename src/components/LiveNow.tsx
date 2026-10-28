"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { ChevronRight, Swords } from "lucide-react";
import { GAMES } from "@/lib/games";
import { GameArt } from "@/components/art/TileArt";
import { useOpenRooms, secondsLeft, Room } from "@/hooks/useOpenRooms";
import { useProfiles, displayName } from "@/lib/profiles";
import { symbolForToken } from "@/lib/tokens";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NAME = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));

export const roomHref = (r: Room) =>
  `/play/${r.game}?room=${r.id}&stake=${formatUnits(BigInt(r.stake || "0"), r.decimals ?? 18)}&token=${r.token ?? ""}`;

/**
 * Real people waiting for an opponent right now, on the home screen where
 * everyone lands. A room is only joinable for ten minutes, so it has to be
 * seen while it's open, not three taps away.
 */
export function LiveNow() {
  const { rooms } = useOpenRooms("home-rooms");
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const list = (rooms ?? []).slice(0, 3);
  const profiles = useProfiles(list.map((r) => r.creator));

  return (
    <section className="mx-auto mt-6 w-full max-w-2xl px-5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-[0.08em] text-ink-dim">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-teal" style={{ animation: "ring 1.6s cubic-bezier(0.23,1,0.32,1) infinite" }} />
            <span className="relative h-2 w-2 rounded-full bg-teal" />
          </span>
          Live now
          {!!rooms?.length && <span className="nums normal-case tracking-normal text-ink-faint">· {rooms.length} waiting</span>}
        </h2>
        <Link href="/lobby" className="flex min-h-11 items-center pl-3 text-[14px] font-semibold text-teal">
          All rooms <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rooms === null || list.length === 0 ? (
        // while rooms load this is the same card with its contents hidden, so it
        // already has the right height and nothing jumps when the answer lands
        <div key={rooms === null ? "loading" : "empty"} aria-hidden={rooms === null || undefined} className={cn("glass flex items-center gap-3 rounded-tile p-4", rooms === null && "animate-pulse")}>
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal", rooms === null && "invisible")}>
            <Swords className="h-5 w-5" />
          </span>
          <div className={cn("min-w-0 flex-1", rooms === null && "invisible")}>
            <p className="text-[16px] font-semibold text-ink">No one is waiting yet</p>
          </div>
          <Link href="/lobby" tabIndex={rooms === null ? -1 : undefined} className={buttonClass("primary", "sm", cn("shrink-0", rooms === null && "invisible"))}>
            Open
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => {
            const stake = Number(formatUnits(BigInt(r.stake || "0"), r.decimals ?? 18));
            const mine = r.creator?.toLowerCase() === me;
            const mins = Math.max(1, Math.ceil(secondsLeft(r) / 60));
            return (
              <li key={r.id} className="enter">
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
                      {mine ? "Your room" : displayName(r.creator, profiles[r.creator.toLowerCase()])} · {mins} min left
                    </p>
                  </div>
                  <span className={buttonClass(mine ? "secondary" : "primary", "sm", "shrink-0 px-3.5")}>{mine ? "Open" : "Join"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
