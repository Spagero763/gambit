"use client";

import { PieceSymbol } from "chess.js";
import { motion } from "framer-motion";
import { ChessPiece } from "./ChessPiece";
import { cn } from "@/lib/cn";

export function PlayerBar({
  name,
  pieceColor,
  active,
  clock,
  lowTime,
  captured,
  edge,
  you,
}: {
  name: string;
  pieceColor: "w" | "b";
  active: boolean;
  clock: string;
  lowTime: boolean;
  captured: PieceSymbol[];
  edge: number; // positive if this player is ahead
  you?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all",
        active ? "glass ring-1 ring-white/20" : "bg-white/[0.03]"
      )}
    >
      {/* avatar */}
      <div className="relative">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl text-base font-bold",
            you
              ? "bg-gradient-to-br from-violet to-violet-deep text-white"
              : "bg-gradient-to-br from-teal-deep to-[#0b5e46] text-white"
          )}
        >
          {name.slice(0, 1)}
        </span>
        {active && (
          <motion.span
            layoutId="chessTurn"
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-teal ring-2 ring-void"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          {edge > 0 && (
            <span className="rounded bg-white/10 px-1.5 text-[10px] font-bold text-ink-dim">
              +{edge}
            </span>
          )}
        </div>
        {/* captured tray */}
        <div className="mt-0.5 flex h-4 items-center">
          {captured.length === 0 ? (
            <span className="text-[10px] text-ink-faint">no captures yet</span>
          ) : (
            <div className="flex -space-x-1.5">
              {captured.map((t, i) => (
                <ChessPiece
                  key={i}
                  type={t}
                  color={pieceColor === "w" ? "b" : "w"}
                  size={16}
                  className="opacity-90"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* clock */}
      <div
        className={cn(
          "rounded-lg px-3 py-1.5 font-mono text-base font-bold tabular-nums transition-colors",
          active ? "bg-white/10 text-ink" : "bg-white/[0.04] text-ink-faint",
          lowTime && active && "bg-rose/20 text-rose"
        )}
      >
        {clock}
      </div>
    </div>
  );
}
