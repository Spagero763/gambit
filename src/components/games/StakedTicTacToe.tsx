"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { evaluate } from "@/lib/games/tictactoe";
import { Mark } from "./xo/Mark";
import { XOBoard } from "./xo/XOBoard";
import { SettleOverlay } from "./SettleOverlay";
import { ResignButton } from "./ResignButton";
import { TimeoutClaim } from "./TimeoutClaim";
import { MatchChat } from "./MatchChat";
import { StakedHeader, MoneySeat, ResultLayer } from "./StakedChrome";
import { useProfiles, displayName } from "@/lib/profiles";
import { play as playSfx } from "@/lib/sfx";

const YOU = "#5aa9ff";
const THEM = "#ffb547";

interface MatchRow {
  id: number;
  game: string;
  chain_id: number;
  creator: string;
  opponent: string | null;
  status: string;
  state: { board: (string | null)[]; marks: Record<string, "X" | "O">; turn: string };
  winner: string | null;
  settle_tx: string | null;
  settle_error: string | null;
  stake?: string;
  token?: string | null;
  decimals?: number;
  turn: string | null;
  updated_at: string;
}

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

export function StakedTicTacToe({ matchId, you, onExit }: { matchId: bigint; you: `0x${string}`; onExit?: () => void }) {
  const me = you.toLowerCase();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const oppAddr = [match?.creator, match?.opponent].find((a) => a && a.toLowerCase() !== me) ?? null;
  const oppProfiles = useProfiles(oppAddr ? [oppAddr] : []);
  const oppName = oppAddr ? displayName(oppAddr, oppProfiles[oppAddr.toLowerCase()]) : "Opponent";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("matches").select("*").eq("id", Number(matchId)).single();
    if (data) setMatch(data as MatchRow);
  }, [matchId]);

  // realtime subscription + a slow poll fallback
  useEffect(() => {
    refresh();
    if (!supabase) return;
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${Number(matchId)}` },
        (payload) => setMatch(payload.new as MatchRow)
      )
      .subscribe();
    pollRef.current = setInterval(refresh, 5000);
    return () => {
      supabase?.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [matchId, refresh]);

  const board = match?.state?.board ?? Array(9).fill(null);
  const myMark = match?.state?.marks?.[me];
  const myTurn = match?.status === "active" && match?.state?.turn === me;
  const finished = match?.status === "settling" || match?.status === "settled";
  const iWon = match?.winner?.toLowerCase() === me;
  const draw = finished && !match?.winner;

  const play = async (cell: number) => {
    if (!myTurn || busy || board[cell]) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await submitMove(matchId, me, { cell });
      if (res.state) setMatch((m) => (m ? { ...m, state: res.state as any } : m));
      playSfx(res.finished ? (res.winner?.toLowerCase() === me ? "win" : res.draw ? "place" : "lose") : "place");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

  // sounds for the opponent's move (your turn again) and game end
  const prevTurnRef = useRef<string | undefined>(undefined);
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!match) return;
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      playSfx(iWon ? "win" : draw ? "place" : "lose");
    }
    const t = match.state?.turn;
    if (prevTurnRef.current && prevTurnRef.current !== t && t === me && match.status === "active") playSfx("place");
    prevTurnRef.current = t;
  }, [match, finished, iWon, draw, me]);

  const status = !match
    ? "Loading match…"
    : match.status === "open"
    ? "Waiting for opponent to join…"
    : finished
    ? match.status === "settling"
      ? "Settling on-chain…"
      : "Settled"
    : myTurn
    ? "Your move"
    : "Opponent's move";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <StakedHeader
        title="Tic-Tac-Toe"
        matchId={matchId}
        stakeWei={match?.stake}
        decimals={match?.decimals}
        token={match?.token}
        onExit={onExit}
        right={match?.status === "active" ? <ResignButton matchId={matchId} you={me} /> : null}
      />

      <MoneySeat
        role="them"
        name={oppName}
        detail={`Plays ${myMark === "X" ? "O" : "X"}`}
        active={match?.status === "active" && !myTurn}
        icon={<span className="h-8 w-8"><Mark kind={myMark === "X" ? "O" : "X"} color={THEM} /></span>}
      />

      <div className="flex flex-1 flex-col items-center justify-center py-3">
        <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />
        <div className="mt-3 w-full max-w-[340px]">
          <XOBoard
            board={board as ("X" | "O" | null)[]}
            onCell={play}
            canPlay={(i) => myTurn && !board[i] && !busy}
            colorOf={(c) => (c === myMark ? YOU : THEM)}
            winLine={evaluate(board as ("X" | "O" | null)[]).line}
          />
        </div>
        <p className="mt-3 text-center text-[14px] text-ink-dim">{status}</p>
        {err && <p className="mt-1 text-center text-[12px] text-rose">{err}</p>}
      </div>

      <MoneySeat
        role="you"
        name="You"
        detail={myMark ? `Plays ${myMark}` : undefined}
        active={myTurn}
        icon={myMark ? <span className="h-8 w-8"><Mark kind={myMark} color={YOU} /></span> : undefined}
      />
      <MatchChat matchId={matchId} me={me} />

      <ResultLayer open={finished}>
        <SettleOverlay
          result={draw ? "draw" : iWon ? "win" : "lose"}
          status={match?.status ?? "settling"}
          settleTx={match?.settle_tx}
          settleError={match?.settle_error}
          chainId={match?.chain_id}
          matchId={matchId}
          shareAddress={me}
          stakeWei={match?.stake}
          decimals={match?.decimals}
          token={match?.token}
        />
      </ResultLayer>
    </div>
  );
}
