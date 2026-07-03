"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, Play, Share2, Check, CalendarDays } from "lucide-react";
import { useAccount } from "wagmi";
import { BlockBlitz } from "@/components/games/blocks/BlockBlitz";
import { BottomNav } from "@/components/BottomNav";
import { dayNumber, daySeed, msToNextBoard, dailyResult, dailyStreak, recordDaily, shareText, DailyResult } from "@/lib/daily";
import { shareOrCopy } from "@/lib/share";

function countdown(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * The Daily Challenge: one Block Blitz board per day, identical for everyone,
 * your first finished run is your result. The share card is the growth loop —
 * a spoiler-free score flex that lands in WhatsApp or X with the link.
 */
export function DailyChallenge() {
  const n = dayNumber();
  const { address } = useAccount();
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  const [result, setResult] = useState<DailyResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [practice, setPractice] = useState(false);
  const [shared, setShared] = useState<"idle" | "shared" | "copied">("idle");

  useEffect(() => {
    const r = dailyResult(n);
    setResult(r);
    setStreak(dailyStreak());
    if (r) setPhase("result");
  }, [n]);

  const finishRun = (score: number) => {
    if (score <= 0) return;
    const out = recordDaily(n, score);
    setResult(out.result);
    setStreak(out.streak);
    if (out.first && address) {
      // feeds the existing free-play events board; silent, best effort
      void fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, game: "blocks", score }),
      }).catch(() => {});
    }
  };

  const share = async () => {
    if (!result) return;
    const r = await shareOrCopy({
      title: "Gambit Daily",
      text: shareText(n, result.score, streak),
      url: "https://www.bestgambit.live/daily",
    });
    if (r !== "failed") setShared(r);
    setTimeout(() => setShared("idle"), 2000);
  };

  // playing: the game owns the whole screen, exactly like free play — no
  // bottom nav overlapping the piece tray (it was blocking view AND drags)
  if (phase === "play") {
    return (
      <BlockBlitz
        seed={daySeed(n)}
        onSubmit={finishRun}
        onExit={() => setPhase(result ? "result" : "intro")}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-4">
      <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 overflow-hidden rounded-3xl border border-amber/25 bg-gradient-to-br from-amber/[0.08] to-transparent p-6 text-center shadow-card"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber/15 text-amber">
          <CalendarDays className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold">Daily Challenge #{n}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-dim">
          One board. Everyone on earth plays the same one. Your first run is your result, so make it count.
        </p>

        {streak > 1 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-[13px] font-semibold text-amber">
            <Flame className="h-4 w-4" /> {streak} day streak
          </p>
        )}

        {phase === "result" && result ? (
          <>
            <div className="mx-auto mt-5 max-w-[16rem] rounded-2xl border border-line bg-void-800 p-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Your result today</p>
              <p className="nums mt-1 text-3xl font-bold text-ink">{result.score.toLocaleString()}</p>
            </div>
            <div className="mt-5 flex flex-col items-center gap-2.5">
              <button
                onClick={share}
                className="btn-primary inline-flex w-full max-w-[16rem] items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
              >
                {shared === "idle" ? <Share2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {shared === "copied" ? "Copied!" : shared === "shared" ? "Shared!" : "Challenge your friends"}
              </button>
              <button
                onClick={() => {
                  setPractice(true);
                  setPhase("play");
                }}
                className="inline-flex w-full max-w-[16rem] items-center justify-center gap-2 rounded-xl border border-line bg-void-800 py-3 text-sm text-ink-dim transition-colors hover:text-ink"
              >
                <Play className="h-4 w-4" /> Play again for practice
              </button>
              <p className="text-[11px] text-ink-faint">
                New board in {countdown(msToNextBoard())}{practice ? " · practice runs don't change your result" : ""}
              </p>
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <button
              onClick={() => setPhase("play")}
              className="btn-primary inline-flex w-full max-w-[16rem] items-center justify-center gap-2 rounded-xl py-3 text-sm shadow-glow"
            >
              <Play className="h-4 w-4" /> Play today's board
            </button>
            <p className="text-[11px] text-ink-faint">New board in {countdown(msToNextBoard())}</p>
          </div>
        )}
      </motion.div>
      <BottomNav />
    </section>
  );
}
