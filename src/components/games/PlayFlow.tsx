"use client";

import { useState } from "react";
import { Game } from "@/lib/games";
import { GameStage } from "./GameStage";
import { MatchSetup } from "./MatchSetup";

export function PlayFlow({ game }: { game: Game }) {
  const [started, setStarted] = useState(false);

  if (game.status !== "live") return <GameStage game={game} />;

  // Solo and tournament games launch straight in; 1v1 games go through the
  // free / staked match setup first.
  if (game.mode !== "1v1") return <GameStage game={game} />;

  if (!started) return <MatchSetup game={game} onStart={() => setStarted(true)} />;
  return <GameStage game={game} />;
}
