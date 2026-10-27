"use client";

import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { TurnDot } from "./TurnDot";

export interface PlayerInfo {
  name: string;
  mark: ReactNode;
  active: boolean;
  accent: string; // tailwind text color class
  clock?: string; // optional formatted time, e.g. "4:32"
  avatar?: ReactNode; // optional player/bot avatar shown instead of the mark
  detail?: string;
}

/** A practice table: the computer across from you, the board between. */
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
  const [you, them] = players;
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <Link href="/" data-nav="back" aria-label="Back to games" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="display min-w-0 flex-1 truncate text-[24px] font-extrabold text-ink">{title}</h1>
        <span className="glass rounded-full px-3 py-1.5 text-[14px] font-semibold text-ink-dim">Practice</span>
      </div>

      <Seat p={them} role="them" />
      <div className="relative flex flex-1 flex-col items-center justify-center py-3">
        {children}
        <p className="mt-3 text-[14px] text-ink-dim">{status}</p>
      </div>
      <Seat p={you} role="you" />
    </div>
  );
}

function Seat({ p, role }: { p: PlayerInfo; role: "you" | "them" }) {
  return (
    <div data-on={p.active ? role : undefined} className="seat flex items-center gap-3 rounded-[18px] px-3 py-2.5">
      <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-xl">{p.avatar ?? p.mark}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-ink">{p.name}</p>
        <p className={cn("flex items-center gap-1.5 truncate text-[14px]", p.active ? (role === "you" ? "text-you" : "text-them") : "text-ink-faint")}>
          {p.active && <TurnDot />}
          {p.active ? (role === "you" ? "Your turn" : "Thinking") : p.detail ?? (role === "them" ? "Computer" : "Waiting")}
        </p>
      </div>
      {p.clock && <span className={cn("display nums text-[18px] font-bold", p.active ? "text-ink" : "text-ink-faint")}>{p.clock}</span>}
    </div>
  );
}
