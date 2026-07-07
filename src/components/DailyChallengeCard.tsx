"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, ChevronRight, Check } from "lucide-react";
import { dayNumber, dailyResult, dailyStreak, dailyGameFor, WIN_SCORE } from "@/lib/daily";
import { GAMES } from "@/lib/games";

const NAME: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.slug, g.name]));

/** Home entry for the Daily Challenge: today's number, your streak, one tap in. */
export function DailyChallengeCard() {
  const [state, setState] = useState<{ n: number; game: string; done: boolean; score: number; streak: number } | null>(null);

  useEffect(() => {
    const n = dayNumber();
    const r = dailyResult(n);
    setState({ n, game: dailyGameFor(n), done: !!r, score: r?.score ?? 0, streak: dailyStreak() });
  }, []);

  if (!state) return null;
  const isBlocks = state.game === "blocks";
  const gameName = NAME[state.game] ?? state.game;

  return (
    <Link
      href="/daily"
      data-tour="challenge"
      className="mx-auto mt-3 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-amber/25 bg-gradient-to-r from-amber/[0.08] to-transparent p-4 transition-colors hover:border-amber/40"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber">
        {state.done ? <Check className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Daily Challenge #{state.n} · {gameName}</p>
        <p className="text-[12px] text-ink-dim">
          {state.done
            ? isBlocks || state.score !== WIN_SCORE
              ? `Done today: ${state.score.toLocaleString()} points. Dare a friend.`
              : `Done today: you beat the bot at ${gameName}. Dare a friend.`
            : isBlocks
              ? "Same board for everyone. One shot at your score."
              : `Beat the bot at ${gameName} today to clear it.`}
        </p>
      </div>
      {state.streak > 1 && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">
          <Flame className="h-3 w-3" /> {state.streak}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
    </Link>
  );
}
