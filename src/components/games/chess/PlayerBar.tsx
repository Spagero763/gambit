"use client";

import { ReactNode } from "react";
import { PieceSymbol } from "chess.js";
import { ChessPiece } from "./ChessPiece";
import { TurnDot } from "../TurnDot";
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
  avatar,
}: {
  name: string;
  pieceColor: "w" | "b";
  active: boolean;
  clock: string;
  lowTime: boolean;
  captured: PieceSymbol[];
  edge: number;
  you?: boolean;
  avatar?: ReactNode;
}) {
  return (
    <div data-on={active ? (you ? "you" : "them") : undefined} className="seat flex items-center gap-3 rounded-[18px] px-3 py-2.5">
      <span className="block h-10 w-10 shrink-0">{avatar}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-body font-semibold leading-tight text-ink">{name}</p>
          {edge > 0 && <span className="display nums text-sm font-bold text-ink-soft">+{edge}</span>}
        </div>
        <div className="mt-0.5 flex h-4 items-center">
          {captured.length === 0 ? (
            <span className={cn("flex items-center gap-1.5 text-sm", active ? (you ? "text-you" : "text-them") : "text-ink-faint")}>
              {active && <TurnDot />}
              {active ? (you ? "Your turn" : "Thinking") : you ? "White" : "Computer · Black"}
            </span>
          ) : (
            <div className="flex -space-x-1.5">
              {captured.map((t, i) => (
                <ChessPiece key={i} type={t} color={pieceColor === "w" ? "b" : "w"} size={16} />
              ))}
            </div>
          )}
        </div>
      </div>
      <span
        className={cn(
          "display nums text-[18px] font-bold",
          lowTime && active ? "text-alert" : active ? "text-ink" : "text-ink-faint"
        )}
      >
        {clock}
      </span>
    </div>
  );
}
