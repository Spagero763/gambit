"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, PieceSymbol, Square } from "chess.js";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { ChessPiece } from "./chess/ChessPiece";
import { glideFor, useSlides } from "./chess/glide";
import { SettleOverlay } from "./SettleOverlay";
import { ResignButton } from "./ResignButton";
import { TimeoutClaim } from "./TimeoutClaim";
import { MatchChat } from "./MatchChat";
import { StakedHeader, ResultLayer } from "./StakedChrome";
import { TurnDot } from "./TurnDot";
import { useProfiles, displayName } from "@/lib/profiles";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

interface ChessState {
  fen: string;
  colors: Record<string, "w" | "b">;
  turn: string;
}

interface MatchRow {
  id: number;
  game: string;
  chain_id: number;
  creator: string;
  opponent: string | null;
  status: string;
  state: ChessState;
  winner: string | null;
  settle_tx: string | null;
  settle_error: string | null;
  stake?: string;
  token?: string | null;
  decimals?: number;
  updated_at: string;
}

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

export function StakedChess({ matchId, you, onExit }: { matchId: bigint; you: `0x${string}`; onExit?: () => void }) {
  const me = you.toLowerCase();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const oppAddr = [match?.creator, match?.opponent].find((a) => a && a.toLowerCase() !== me) ?? null;
  const oppProfiles = useProfiles(oppAddr ? [oppAddr] : []);
  const oppName = oppAddr ? displayName(oppAddr, oppProfiles[oppAddr.toLowerCase()]) : "Opponent";
  const [selected, setSelected] = useState<Square | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("matches").select("*").eq("id", Number(matchId)).single();
    if (data) setMatch(data as MatchRow);
  }, [matchId]);

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

  const fen = match?.state?.fen;
  const myColor = match?.state?.colors?.[me];
  const flip = myColor === "b";
  const myTurn = match?.status === "active" && match?.state?.turn === me;
  const finished = match?.status === "settling" || match?.status === "settled";
  const iWon = match?.winner?.toLowerCase() === me;
  const draw = finished && !match?.winner;

  const chess = useMemo(() => {
    try {
      return fen ? new Chess(fen) : null;
    } catch {
      return null;
    }
  }, [fen]);

  const board = chess?.board() ?? null;
  const inCheck = chess?.inCheck() ?? false;
  const turnColor = chess?.turn();

  const targets = useMemo(() => {
    const m = new Map<Square, Move>();
    if (!chess || !selected || !myTurn) return m;
    for (const mv of chess.moves({ square: selected, verbose: true }) as Move[]) {
      if (!m.has(mv.to as Square) || mv.promotion === "q") m.set(mv.to as Square, mv);
    }
    return m;
  }, [chess, selected, myTurn]);

  const doMove = async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setSelected(null);
    try {
      const captured = !!chess?.get(to);
      const res = await submitMove(matchId, me, { from, to, promotion });
      if (res.state) setMatch((m) => (m ? { ...m, state: res.state as ChessState } : m));
      play(res.finished ? (res.winner?.toLowerCase() === me ? "win" : "lose") : captured ? "capture" : "place");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

  // sounds for the OPPONENT's move (your turn again) and game end
  const prevTurnRef = useRef<string | undefined>(undefined);
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!match) return;
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      play(iWon ? "win" : draw ? "place" : "lose");
    }
    const t = match.state?.turn;
    if (prevTurnRef.current && prevTurnRef.current !== t && t === me && match.status === "active") play("place");
    prevTurnRef.current = t;
  }, [match, finished, iWon, draw, me]);

  const onSquare = (sq: Square) => {
    if (!chess || !myTurn || finished || busy) return;
    if (selected && targets.has(sq)) {
      const mv = targets.get(sq)!;
      if (mv.promotion) setPromo({ from: selected, to: sq });
      else doMove(selected, sq);
      return;
    }
    const p = chess.get(sq);
    if (p && p.color === myColor) setSelected(sq);
    else setSelected(null);
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
    : "Opponent is thinking";

  // a position loaded from the server has no history, so the last move is
  // read from what changed between the two positions
  const slides = useSlides(fen);
  const last = slides.moves[0] ?? null;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <StakedHeader
        title="Chess"
        matchId={matchId}
        stakeWei={match?.stake}
        decimals={match?.decimals}
        token={match?.token}
        onExit={onExit}
        right={match?.status === "active" ? <ResignButton matchId={matchId} you={me} /> : null}
      />

      <PlayerStrip
        label={oppName}
        color={myColor === "w" ? "b" : "w"}
        active={match?.status === "active" && !myTurn}
        deadlineMs={match?.status === "active" && match?.updated_at ? new Date(match.updated_at).getTime() + 120_000 : null}
      />

      <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />

      <div className="relative mt-3">
        <div
          className="rounded-[20px] p-2.5"
          style={{
            background: "linear-gradient(160deg, #2b2620, #1a1611)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -4px 10px rgba(0,0,0,0.5), 0 26px 60px -26px rgba(0,0,0,0.95), 0 0 70px -24px rgba(255,200,120,0.3)",
          }}
        >
          <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-md ring-1 ring-black/40">
            {Array.from({ length: 64 }).map((_, i) => {
              const r = Math.floor(i / 8);
              const c = i % 8;
              const ar = flip ? 7 - r : r;
              const ac = flip ? 7 - c : c;
              const square = (FILES[ac] + (8 - ar)) as Square;
              const piece = board ? board[ar][ac] : null;
              const lightSq = (ar + ac) % 2 === 0;
              const isSel = selected === square;
              const isTarget = targets.has(square);
              const isLast = last && (last.from === square || last.to === square);
              const isCheckSq = inCheck && piece?.type === "k" && piece.color === turnColor;
              return (
                <button
                  key={square}
                  onClick={() => onSquare(square)}
                  className={cn("relative flex items-center justify-center", lightSq ? "bg-[#eeeed2]" : "bg-[#769656]")}
                >
                  {isLast && <span className="absolute inset-0 bg-[#f6d66b]/45" />}
                  {isSel && <span className="absolute inset-0 bg-[#f6d66b]/55" />}
                  {isCheckSq && <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(224,108,139,0.95),transparent_72%)]" />}
                  {piece && (() => {
                    const g = glideFor(square, slides, flip);
                    return (
                      <span key={g.key} data-glide={g.on} style={g.style} className="absolute inset-0 z-10 grid place-items-center">
                        <ChessPiece type={piece.type} color={piece.color} size={40} className="select-none" />
                      </span>
                    );
                  })()}
                  {isTarget &&
                    (piece ? (
                      <span className="absolute inset-1 rounded-full ring-[3px] ring-black/30" />
                    ) : (
                      <span className="absolute h-[28%] w-[28%] rounded-full bg-black/25" />
                    ))}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {promo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 grid place-items-center bg-void/70 backdrop-blur-sm"
            >
              <div className="panel rounded-[20px] p-4 text-center">
                <p className="mb-3 text-sm font-semibold text-ink">Promote to</p>
                <div className="flex gap-2">
                  {(["q", "r", "b", "n"] as PieceSymbol[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        doMove(promo.from, promo.to, t);
                        setPromo(null);
                      }}
                      className="pressable grid h-14 w-14 place-items-center rounded-[14px] surface-2"
                    >
                      <ChessPiece type={t} color={myColor ?? "w"} size={40} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <p className="mt-3 text-center text-[14px] text-ink-dim">{status}</p>
      {err && <p role="alert" className="mt-1 text-center text-[12px] text-rose">{err}</p>}

      <PlayerStrip
        label="You"
        color={myColor ?? "w"}
        active={!!myTurn}
        you
        deadlineMs={match?.status === "active" && match?.updated_at ? new Date(match.updated_at).getTime() + 120_000 : null}
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

function PlayerStrip({
  label,
  color,
  active,
  you,
  deadlineMs,
}: {
  label: string;
  color: "w" | "b";
  active: boolean;
  you?: boolean;
  /** when set and active, show a ticking move clock counting down to forfeit */
  deadlineMs?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || !deadlineMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active, deadlineMs]);
  const left = active && deadlineMs ? Math.max(0, deadlineMs - now) : null;
  const mm = left !== null ? Math.floor(left / 60000) : 0;
  const ss = left !== null ? Math.floor((left % 60000) / 1000) : 0;

  return (
    <div data-on={active ? (you ? "you" : "them") : undefined} className="seat mt-3 flex items-center gap-3 rounded-[18px] px-3 py-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06]">
        <span className={cn("h-5 w-5 rounded-full ring-1", color === "w" ? "bg-[#f5f0e6] ring-black/20" : "bg-[#2b2836] ring-white/20")} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[15px] font-semibold text-ink">{you ? "You" : label}</p>
        <p className={cn("flex items-center gap-1.5 text-[12px]", active ? (you ? "text-you" : "text-them") : "text-ink-faint")}>
          {active && <TurnDot />}
          {active ? (you ? "Your turn" : "Their turn") : color === "w" ? "White" : "Black"}
        </p>
      </div>
      {left !== null && (
        <span className={cn("display nums text-[20px] font-bold", left <= 30_000 ? "text-rose" : "text-ink")}>
          {mm}:{ss.toString().padStart(2, "0")}
        </span>
      )}
    </div>
  );
}
