"use client";

import { useState } from "react";
import { Game } from "@/lib/games";
import { Difficulty } from "@/lib/difficulty";
import { GameStage } from "./GameStage";
import { MatchSetup } from "./MatchSetup";

export interface StakeCtx {
  matchId: bigint;
  you: `0x${string}`;
}

export function PlayFlow({ game }: { game: Game }) {
  const [opts, setOpts] = useState<{ difficulty: Difficulty; stake?: StakeCtx } | null>(null);

  if (game.status !== "live") return <GameStage game={game} />;

  // Solo / tournament games launch straight in. 1v1 games (incl. Whot) go
  // through the setup so they can be played free or staked.
  if (game.mode !== "1v1") return <GameStage game={game} />;

  if (!opts)
    return (
      <MatchSetup
        game={game}
        onStart={(difficulty, stake) => setOpts({ difficulty, stake })}
      />
    );
  return <GameStage game={game} difficulty={opts.difficulty} stake={opts.stake} />;
}
