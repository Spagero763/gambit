"use client";

import { useState } from "react";
import { Game } from "@/lib/games";
import { GameStage } from "./GameStage";
import { MatchSetup } from "./MatchSetup";

export function PlayFlow({ game }: { game: Game }) {
  const [started, setStarted] = useState(false);

  // Games that are not live skip setup and render their own placeholder.
  if (game.status !== "live") return <GameStage game={game} />;

  if (!started) return <MatchSetup game={game} onStart={() => setStarted(true)} />;
  return <GameStage game={game} />;
}
