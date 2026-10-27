"use client";

import Link from "next/link";
import { Game } from "@/lib/games";
import { GameArt, WhotTableArt } from "@/components/art/TileArt";
import { buttonClass } from "@/components/ui/Button";
import { Tilt } from "@/components/ui/Tilt";

const META: Record<string, string> = {
  chess: "1v1 · classic",
  "tic-tac-toe": "1v1 · quick",
  snakes: "1v1 · dice",
  blocks: "Solo · beat your best",
};

export function GameTile({ game }: { game: Game }) {
  return (
    <Tilt>
      <Link href={`/play/${game.slug}`} className="glass relative block overflow-hidden rounded-tile">
        <div className="relative aspect-[4/3] overflow-hidden">
          <GameArt slug={game.slug} className="h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 h-1/4" style={{ background: "linear-gradient(180deg, rgba(11,15,23,0), rgba(11,15,23,0.85))" }} />
        </div>
        <div className="px-3.5 pb-3 pt-2">
          <p className="display text-[18px] font-extrabold leading-tight text-ink">{game.name}</p>
          <p className="text-[14px] font-semibold text-ink-soft">{META[game.slug]}</p>
        </div>
      </Link>
    </Tilt>
  );
}

export function WhotHero() {
  return (
    <Tilt max={4}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#03190f] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)]">
        <Link href="/play/whot" className="relative block h-[232px] overflow-hidden">
          <WhotTableArt card={84} className="absolute inset-0" />
          <div className="absolute left-5 top-5">
            <p className="display text-[30px] font-extrabold leading-none text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.6)]">Naija Whot</p>
            <p className="mt-1.5 text-[14px] font-semibold text-white/75">1v1 · the deck you know</p>
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,0))",
              animation: "shine 1.4s cubic-bezier(0.23,1,0.32,1) 900ms 1 both",
            }}
          />
        </Link>
        <div className="relative grid grid-cols-2 gap-2.5 border-t border-white/10 p-4">
          <Link href="/play/whot?practice=1" className={buttonClass("secondary", "md", "h-12")}>
            Practice free
          </Link>
          <Link href="/play/whot?mode=staked" className={buttonClass("primary", "md", "h-12")}>
            Play for money
          </Link>
        </div>
      </div>
    </Tilt>
  );
}
