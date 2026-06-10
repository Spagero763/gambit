"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { Mark } from "./xo/Mark";
import { SettleOverlay } from "./SettleOverlay";
import { TimeoutClaim } from "./TimeoutClaim";
import { cn } from "@/lib/cn";

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

export function StakedTicTacToe({ matchId, you }: { matchId: bigint; you: `0x${string}` }) {
  const me = you.toLowerCase();
  const [match, setMatch] = useState<MatchRow | null>(null);
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
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="rounded-full glass px-3 py-1.5 text-xs font-semibold text-teal">
          Staked · #{matchId.toString()}
        </span>
      </div>

      <h1 className="mt-5 font-display text-2xl font-bold">Tic-Tac-Toe</h1>

      {/* players */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <PlayerTag label="You" mark={myMark} active={myTurn} accent="text-violet-bright" />
        <span className="text-xs text-ink-faint">vs</span>
        <PlayerTag
          label="Opponent"
          mark={myMark === "X" ? "O" : "X"}
          active={match?.status === "active" && !myTurn}
          accent="text-teal"
          alignRight
        />
      </div>

      <p className="mt-3 text-center text-sm text-ink-dim">{status}</p>

      <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />

      {/* board */}
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[330px] rounded-3xl glass p-3 shadow-card">
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          {board.map((cell, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <button
                key={i}
                onClick={() => play(i)}
                disabled={!myTurn || !!cell || busy}
                className={cn(
                  "relative grid place-items-center transition-colors",
                  col < 2 && "border-r-2 border-white/10",
                  row < 2 && "border-b-2 border-white/10",
                  myTurn && !cell && "hover:bg-white/[0.04]"
                )}
              >
                <div className="pointer-events-none h-full w-full">
                  <AnimatePresence>{cell && <Mark key={cell} kind={cell as "X" | "O"} />}</AnimatePresence>
                </div>
              </button>
            );
          })}
        </div>

        {/* result overlay */}
        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center rounded-3xl bg-void/75 backdrop-blur-sm"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {err && <p className="mt-3 text-center text-[11px] text-rose">{err}</p>}
    </div>
  );
}

function PlayerTag({
  label,
  mark,
  active,
  accent,
  alignRight,
}: {
  label: string;
  mark?: "X" | "O";
  active?: boolean;
  accent: string;
  alignRight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5 transition-all",
        active ? "glass ring-1 ring-white/15" : "bg-white/[0.03]",
        alignRight && "flex-row-reverse text-right"
      )}
    >
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-white/5", accent)}>
        {mark && (
          <span className="h-7 w-7">
            <Mark kind={mark} />
          </span>
        )}
      </span>
      <div className={cn("leading-tight", alignRight && "items-end")}>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-[10px] text-ink-faint">{active ? "to move" : "waiting"}</p>
      </div>
    </div>
  );
}
