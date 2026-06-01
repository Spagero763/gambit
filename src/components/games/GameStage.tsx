"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Game } from "@/lib/games";
import { TicTacToe } from "./TicTacToe";
import { ChessGame } from "./ChessGame";

export function GameStage({ game }: { game: Game }) {
  switch (game.slug) {
    case "tic-tac-toe":
      return <TicTacToe />;
    case "chess":
      return <ChessGame />;
    default:
      return <ComingSoon game={game} />;
  }
}

function ComingSoon({ game }: { game: Game }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim"
      >
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <div className="mt-10 rounded-3xl glass p-8 text-center shadow-card">
        <div className="text-6xl opacity-80">{game.glyph}</div>
        <h1 className="mt-4 font-display text-2xl font-bold">{game.name}</h1>
        <p className="mt-1 text-sm text-ink-dim">{game.tagline}</p>
        <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-ink-faint">
          The table is being set. The board and live play land in the next build.
        </p>
      </div>
    </div>
  );
}
