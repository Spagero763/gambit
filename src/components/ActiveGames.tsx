"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, Trophy, Hourglass } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { GAMES } from "@/lib/games";
import { GameCover } from "@/components/art/GameCover";
import { cn } from "@/lib/cn";

const GAME = Object.fromEntries(GAMES.map((g) => [g.slug, g]));

interface LiveMatch {
  id: number;
  game: string;
  creator: string;
  opponent: string | null;
  status: string;
  turn: string | null;
}
interface LiveCup {
  id: number;
  game: string;
  status: string;
}

/**
 * "Your games" — one tap back into anything you have running: live 1v1s
 * (deep-links auto-resume the board) and cups you're entered in. The single
 * most important navigation aid: nobody should ever lose a live match because
 * they closed the app.
 */
export function ActiveGames() {
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [cups, setCups] = useState<LiveCup[]>([]);

  useEffect(() => {
    if (!me || !supabase) {
      setMatches([]);
      setCups([]);
      return;
    }
    let live = true;
    const load = async () => {
      const [m, tp] = await Promise.all([
        supabase!
          .from("matches")
          .select("id,game,creator,opponent,status,turn,tournament_id")
          .or(`creator.eq.${me},opponent.eq.${me}`)
          .in("status", ["open", "active"])
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase!.from("tournament_players").select("tournament_id").eq("address", me),
      ]);
      if (!live) return;
      setMatches(((m.data as any[]) ?? []).filter((x) => !x.tournament_id));
      const ids = ((tp.data as any[]) ?? []).map((r) => r.tournament_id);
      if (ids.length) {
        const { data: ts } = await supabase!
          .from("tournaments")
          .select("id,game,status")
          .in("id", ids)
          .in("status", ["open", "active"])
          .limit(6);
        if (live) setCups((ts as LiveCup[]) ?? []);
      } else {
        setCups([]);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [me]);

  if (!me || (matches.length === 0 && cups.length === 0)) return null;

  return (
    <section className="mx-auto mt-5 w-full max-w-2xl">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        <Swords className="h-3.5 w-3.5 text-teal" /> Your games
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 [-webkit-overflow-scrolling:touch]">
        {cups.map((c) => (
          <Card
            key={`c${c.id}`}
            href={`/tournament/${c.id}`}
            art={GAME[c.game]?.art}
            title={`${GAME[c.game]?.name ?? c.game} Cup`}
            badge={c.status === "open" ? "Filling up" : "LIVE"}
            urgent={c.status === "active"}
            icon={<Trophy className="h-3 w-3" />}
          />
        ))}
        {matches.map((m) => {
          const myMove = m.status === "active" && m.turn?.toLowerCase() === me;
          return (
            <Card
              key={m.id}
              href={`/play/${m.game}?room=${m.id}`}
              art={GAME[m.game]?.art}
              title={`${GAME[m.game]?.name ?? m.game} #${m.id}`}
              badge={m.status === "open" ? "Waiting for opponent" : myMove ? "YOUR MOVE" : "Their move"}
              urgent={myMove}
              icon={m.status === "open" ? <Hourglass className="h-3 w-3" /> : <Swords className="h-3 w-3" />}
            />
          );
        })}
      </div>
    </section>
  );
}

function Card({
  href,
  art,
  title,
  badge,
  urgent,
  icon,
}: {
  href: string;
  art?: any;
  title: string;
  badge: string;
  urgent?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="shrink-0">
      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "flex w-[200px] items-center gap-2.5 rounded-2xl border p-2.5 transition-colors",
          urgent ? "border-teal/50 bg-teal/[0.08]" : "border-line bg-void-700 hover:border-line-strong"
        )}
      >
        <span className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
          {art ? <GameCover art={art} className="h-full w-full" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold text-ink">{title}</span>
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
              urgent ? "text-teal" : "text-ink-faint"
            )}
          >
            {icon}
            {badge}
          </span>
        </span>
      </motion.div>
    </Link>
  );
}
