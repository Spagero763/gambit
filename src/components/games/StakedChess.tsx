"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, PieceSymbol, Square } from "chess.js";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { ChessPiece } from "./chess/ChessPiece";
import { SettleOverlay } from "./SettleOverlay";
import { TimeoutClaim } from "./TimeoutClaim";
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
  updated_at: string;
}

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

export function StakedChess({ matchId, you }: { matchId: bigint; you: `0x${string}` }) {
  const me = you.toLowerCase();
  const [match, setMatch] = useState<MatchRow | null>(null);
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
      const res = await submitMove(matchId, me, { from, to, promotion });
      if (res.state) setMatch((m) => (m ? { ...m, state: res.state as ChessState } : m));
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

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

  // last move squares from history
  const last = useMemo(() => {
    if (!chess) return null;
    const h = chess.history({ verbose: true }) as Move[];
    const m = h[h.length - 1];
    return m ? { from: m.from as Square, to: m.to as Square } : null;
  }, [chess]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="rounded-full border border-line bg-void-700 px-3 py-1.5 text-xs font-semibold text-teal">
          Staked · #{matchId.toString()}
        </span>
      </div>

      <PlayerStrip label="Opponent" color={myColor === "w" ? "b" : "w"} active={match?.status === "active" && !myTurn} />

      <p className="mt-3 text-center text-sm text-ink-dim">{status}</p>

      <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />

      <div className="relative mt-3">
        <div
          className="rounded-[20px] p-2.5"
          style={{
            background: "linear-gradient(160deg, #2b2620, #1a1611)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -4px 10px rgba(0,0,0,0.5), 0 26px 60px -26px rgba(0,0,0,0.95)",
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
                  {piece && (
                    <span className="relative z-10">
                      <ChessPiece type={piece.type} color={piece.color} size={40} className="select-none" />
                    </span>
                  )}
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
              <div className="rounded-2xl border border-line bg-void-700 p-4 text-center shadow-pop">
                <p className="mb-3 text-sm font-semibold text-ink">Promote to</p>
                <div className="flex gap-2">
                  {(["q", "r", "b", "n"] as PieceSymbol[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        doMove(promo.from, promo.to, t);
                        setPromo(null);
                      }}
                      className="grid h-14 w-14 place-items-center rounded-xl bg-void-800 ring-1 ring-line transition-colors hover:bg-void-600"
                    >
                      <ChessPiece type={t} color={myColor ?? "w"} size={40} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 grid place-items-center rounded-[20px] bg-void/80 backdrop-blur-sm"
            >
              <SettleOverlay
                result={draw ? "draw" : iWon ? "win" : "lose"}
                status={match?.status ?? "settling"}
                settleTx={match?.settle_tx}
                settleError={match?.settle_error}
                chainId={match?.chain_id}
                matchId={matchId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PlayerStrip label="You" color={myColor ?? "w"} active={!!myTurn} you />

      {err && <p className="mt-3 text-center text-[11px] text-rose">{err}</p>}
    </div>
  );
}

function PlayerStrip({ label, color, active, you }: { label: string; color: "w" | "b"; active: boolean; you?: boolean }) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-all",
        active ? "border-line-strong bg-void-700" : "border-line bg-void-800"
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-void-600">
        <span className={cn("h-4 w-4 rounded-full ring-1", color === "w" ? "bg-[#f5f0e6] ring-black/20" : "bg-[#2b2836] ring-white/20")} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">{you ? "You" : label}</p>
        <p className="text-[10px] text-ink-faint">{color === "w" ? "White" : "Black"}</p>
      </div>
      {active && <span className="ml-auto h-2 w-2 rounded-full bg-teal" />}
    </div>
  );
}
