"use client";

import { useState } from "react";
import { Game } from "@/lib/games";
import { Difficulty } from "@/lib/difficulty";
import { GameStage } from "./GameStage";
import { MatchSetup } from "./MatchSetup";

export function PlayFlow({ game }: { game: Game }) {
  const [opts, setOpts] = useState<{ difficulty: Difficulty } | null>(null);

  if (game.status !== "live") return <GameStage game={game} />;

  // Solo / tournament games launch straight in; 1v1 games go through setup.
  if (game.mode !== "1v1") return <GameStage game={game} />;

  if (!opts) return <MatchSetup game={game} onStart={(difficulty) => setOpts({ difficulty })} />;
  return <GameStage game={game} difficulty={opts.difficulty} />;
}
