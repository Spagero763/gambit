"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Game } from "@/lib/games";
import { TicTacToe } from "./TicTacToe";
import { StakedTicTacToe } from "./StakedTicTacToe";
import { ChessGame } from "./ChessGame";
import { StakedChess } from "./StakedChess";
import { BlockBlitz } from "./blocks/BlockBlitz";
import { SnakesLadders } from "./snakes/SnakesLadders";
import { StakedSnakes } from "./StakedSnakes";
import { WhotGame } from "./whot/WhotGame";
import { StakedWhot } from "./StakedWhot";
import { BoardCoach } from "./BoardCoach";
import { GameCover } from "@/components/art/GameCover";
import { Difficulty } from "@/lib/difficulty";
import type { StakeCtx } from "./PlayFlow";

export function GameStage({
  game,
  difficulty = "normal",
  stake,
}: {
  game: Game;
  difficulty?: Difficulty;
  stake?: StakeCtx;
}) {
  let body: React.ReactNode;
  switch (game.slug) {
    case "tic-tac-toe":
      // staked = real-time human vs human (server-authoritative); free = vs engine
      body = stake ? <StakedTicTacToe matchId={stake.matchId} you={stake.you} /> : <TicTacToe difficulty={difficulty} />;
      break;
    case "chess":
      // staked = real-time human vs human (server-authoritative); free = vs engine
      body = stake ? <StakedChess matchId={stake.matchId} you={stake.you} /> : <ChessGame difficulty={difficulty} />;
      break;
    case "blocks":
      body = <BlockBlitz />;
      break;
    case "snakes":
      // staked = real-time human vs human with server-rolled dice; free = vs bot
      body = stake ? <StakedSnakes matchId={stake.matchId} you={stake.you} /> : <SnakesLadders difficulty={difficulty} />;
      break;
    case "whot":
      // staked = real-time 1v1 with hidden hands (server-authoritative); free = WhotGame (2-6 + tournament)
      body = stake ? <StakedWhot matchId={stake.matchId} you={stake.you} /> : <WhotGame />;
      break;
    default:
      body = <ComingSoon game={game} />;
  }
  // first-time on-board coach for free play (points the hand at the real board,
  // tray, hand, dice…). Staked games skip it — those players know the rules.
  return (
    <>
      {!stake && <BoardCoach slug={game.slug} />}
      {body}
    </>
  );
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
        <div className="mx-auto h-24 w-40 overflow-hidden rounded-xl border border-white/10">
          <GameCover art={game.art} className="h-full w-full" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">{game.name}</h1>
        <p className="mt-1 text-sm text-ink-dim">{game.tagline}</p>
        <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-ink-faint">
          The table is being set. The board and live play land in the next build.
        </p>
      </div>
    </div>
  );
}
