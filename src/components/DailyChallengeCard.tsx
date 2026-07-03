"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, ChevronRight, Check } from "lucide-react";
import { dayNumber, dailyResult, dailyStreak } from "@/lib/daily";

/** Home entry for the Daily Challenge: today's number, your streak, one tap in. */
export function DailyChallengeCard() {
  const [state, setState] = useState<{ n: number; done: boolean; score: number; streak: number } | null>(null);

  useEffect(() => {
    const n = dayNumber();
    const r = dailyResult(n);
    setState({ n, done: !!r, score: r?.score ?? 0, streak: dailyStreak() });
  }, []);

  if (!state) return null;

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
        <p className="text-sm font-semibold text-ink">Daily Challenge #{state.n}</p>
        <p className="text-[12px] text-ink-dim">
          {state.done
            ? `Done today: ${state.score.toLocaleString()} points. Dare a friend.`
            : "Same board for everyone. One shot at your score."}
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
