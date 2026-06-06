"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface PlayerInfo {
  name: string;
  mark: ReactNode;
  active: boolean;
  accent: string; // tailwind text color class
  clock?: string; // optional formatted time, e.g. "4:32"
  avatar?: ReactNode; // optional player/bot avatar shown instead of the mark
}

export function MatchShell({
  title,
  status,
  players,
  children,
}: {
  title: string;
  status: string;
  players: [PlayerInfo, PlayerInfo];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="rounded-full border border-line bg-void-700 px-3 py-1.5 text-xs font-semibold text-ink-dim">
          Free play
        </span>
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>

      {/* Player HUD */}
      <div className="mt-4 flex items-center gap-3">
        {players.map((p, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-all",
              p.active ? "border-line-strong bg-void-700" : "border-line bg-void-800"
            )}
          >
            {p.avatar ? (
              <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-line">{p.avatar}</span>
            ) : (
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg bg-void-600 text-base font-semibold",
                  p.accent
                )}
              >
                {p.mark}
              </span>
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">{p.name}</p>
              <p className="text-[10px] text-ink-faint">
                {p.active ? "to play" : "waiting"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {p.clock && (
                <span
                  className={cn(
                    "rounded-md bg-void-600 px-2 py-1 font-mono text-xs tabular-nums",
                    p.active ? "text-ink" : "text-ink-faint"
                  )}
                >
                  {p.clock}
                </span>
              )}
              {p.active && (
                <motion.span
                  layoutId="turnDot"
                  className="h-2 w-2 rounded-full bg-teal"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-sm text-ink-dim">{status}</p>

      <div className="relative mt-4 flex flex-1 items-start justify-center">
        {children}
      </div>
    </div>
  );
}
