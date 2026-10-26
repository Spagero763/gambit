"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Game } from "@/lib/games";
import { Difficulty } from "@/lib/difficulty";
import { GameStage } from "./GameStage";
import { MatchSetup } from "./MatchSetup";
import { MoneyNudge } from "./ResultOverlay";
import { VersusIntro } from "./VersusIntro";

export interface StakeCtx {
  matchId: bigint;
  you: `0x${string}`;
}

export function PlayFlow({ game }: { game: Game }) {
  const [opts, setOpts] = useState<{ difficulty: Difficulty; stake?: StakeCtx } | null>(null);
  const [setupMode, setSetupMode] = useState<"free" | "staked" | undefined>(undefined);
  const [intro, setIntro] = useState(false);
  const endIntro = useCallback(() => setIntro(false), []);

  if (game.status !== "live") return <GameStage game={game} />;

  // Solo / tournament games launch straight in. 1v1 games (incl. Whot) go
  // through the setup so they can be played free or staked.
  if (game.mode !== "1v1") return <GameStage game={game} />;

  if (!opts)
    return (
      <MatchSetup
        key={setupMode ?? "first"}
        game={game}
        initialMode={setupMode}
        onStart={(difficulty, stake, fresh) => {
          setOpts({ difficulty, stake });
          // the board loads underneath while the two players meet
          setIntro(!!stake && !!fresh);
        }}
      />
    );

  // a practice win is the moment to offer a real opponent
  const toMoney = () => {
    setSetupMode("staked");
    setOpts(null);
  };
  return (
    <MoneyNudge.Provider value={opts.stake ? undefined : toMoney}>
      <GameStage game={game} difficulty={opts.difficulty} stake={opts.stake} />
      <AnimatePresence>
        {intro && opts.stake && <VersusIntro key="vs" matchId={opts.stake.matchId} you={opts.stake.you} onDone={endIntro} />}
      </AnimatePresence>
    </MoneyNudge.Provider>
  );
}
