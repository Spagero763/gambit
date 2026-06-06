"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchWhot, whotAction, WhotView } from "@/lib/matchClient";
import { Card, Shape, SHAPE_LABEL, isLegal } from "@/lib/games/whot";
import { WhotCardBack, WhotCardFace, WhotShape } from "./whot/WhotCard";
import { play } from "@/lib/sfx";
import { cn } from "@/lib/cn";

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

export function StakedWhot({ matchId, you }: { matchId: bigint; you: `0x${string}` }) {
  const me = you.toLowerCase();
  const [view, setView] = useState<WhotView | null>(null);
  const [calling, setCalling] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await fetchWhot(matchId, me));
    } catch {
      /* keep last view */
    }
  }, [matchId, me]);

  useEffect(() => {
    load();
    if (!supabase) return;
    const channel = supabase
      .channel(`whot-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${Number(matchId)}` },
        () => load()
      )
      .subscribe();
    pollRef.current = setInterval(load, 4000);
    return () => {
      supabase?.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [matchId, load]);

  const opp = view?.order.find((a) => a !== me);
  const oppCount = (opp && view?.counts?.[opp]) || 0;
  const hand = view?.yourHand ?? [];
  const top = view?.top ?? null;
  const active = view?.active ?? null;
  const pending = view?.pending ?? null;
  const myTurn = view?.status === "active" && view?.turn === me;
  const finished = view?.status === "settling" || view?.status === "settled";
  const iWon = view?.winner?.toLowerCase() === me;

  const legalId = (c: Card) =>
    pending ? c.num === pending.num : active ? isLegal(c, top?.num ?? 0, active) : false;

  const act = async (action: Parameters<typeof whotAction>[2]) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await whotAction(matchId, me, action);
      setView(res);
      if (res.status === "settled" || res.status === "settling") play(res.winner?.toLowerCase() === me ? "win" : "lose");
      else play(action.type === "draw" ? "deal" : "place");
    } catch (e: any) {
      setErr(e?.message ?? "Move failed");
    } finally {
      setBusy(false);
    }
  };

  const playCard = (c: Card) => {
    if (!myTurn || busy || calling || !legalId(c)) return;
    if (c.shape === "whot") setCalling(c);
    else act({ type: "play", cardId: c.id });
  };

  const status = !view
    ? "Loading match…"
    : view.status === "open"
    ? "Waiting for opponent to join…"
    : finished
    ? view.status === "settling"
      ? "Settling on-chain…"
      : "Settled"
    : pending
    ? `Draw ${pending.amount} or stack a ${pending.num}`
    : myTurn
    ? "Your turn"
    : "Opponent's turn";

  const fan = (i: number, total: number) => {
    const spread = Math.min(7, 40 / Math.max(1, total));
    const mid = (total - 1) / 2;
    return { rot: (i - mid) * spread, y: Math.abs(i - mid) * 4 };
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="rounded-full border border-line bg-void-700 px-3 py-1.5 text-xs font-semibold text-teal">
          Staked · #{matchId.toString()}
        </span>
      </div>

      {/* opponent */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <div className={cn("flex items-center gap-2 rounded-2xl border px-3 py-1.5", view?.status === "active" && !myTurn ? "border-teal/40 bg-void-700" : "border-line bg-void-800")}>
          <span className="text-[11px] font-semibold text-ink">Opponent</span>
          <span className="text-[9px] text-ink-faint">{oppCount} cards</span>
        </div>
        <div className="flex -space-x-3.5">
          {Array.from({ length: Math.min(8, oppCount) }).map((_, i) => (
            <div key={i} className="h-8 w-[22px]" style={{ transform: `rotate(${(i - Math.min(8, oppCount) / 2) * 5}deg)` }}>
              <WhotCardBack />
            </div>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="mt-4 flex flex-1 items-center justify-center gap-6">
        <button onClick={() => act({ type: "draw" })} disabled={!myTurn || busy || !!calling} className="flex flex-col items-center gap-1.5 disabled:opacity-50">
          <div className="relative h-24 w-16">
            <div className="absolute inset-0 translate-x-1 translate-y-1">
              <WhotCardBack />
            </div>
            <div className="absolute inset-0">
              <WhotCardBack />
            </div>
          </div>
          <span className="text-[10px] font-semibold text-ink-dim">Market</span>
        </button>

        <div className="flex flex-col items-center gap-1.5">
          <div className="relative h-24 w-16">
            <AnimatePresence mode="popLayout">
              {top && (
                <motion.div key={top.id} initial={{ scale: 0.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="absolute inset-0">
                  <WhotCardFace shape={top.shape} num={top.num} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {active && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-dim">
              <WhotShape shape={active} size={12} /> {SHAPE_LABEL[active]}
            </span>
          )}
        </div>
      </div>

      {/* status */}
      <div className="mb-2 text-center">
        {pending ? (
          <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-bold text-rose">{status}</span>
        ) : (
          <span className={cn("text-sm", myTurn ? "text-teal" : "text-ink-dim")}>{status}</span>
        )}
      </div>

      {/* your hand */}
      <div className="relative flex h-32 items-end justify-center">
        {hand.map((c, i) => {
          const { rot, y } = fan(i, hand.length);
          const legal = myTurn && legalId(c);
          return (
            <motion.button
              key={c.id}
              onClick={() => playCard(c)}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y, opacity: 1, rotate: rot }}
              whileHover={legal ? { y: y - 18, scale: 1.05 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{ transformOrigin: "bottom center", marginLeft: i === 0 ? 0 : -20, zIndex: legal ? 20 + i : i }}
              className={cn("h-28 w-[64px] shrink-0", myTurn && !legal && "opacity-55")}
            >
              <div className={cn("h-full w-full rounded-xl", legal && "ring-2 ring-teal/80")}>
                <WhotCardFace shape={c.shape} num={c.num} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {err && <p className="mt-2 text-center text-[11px] text-rose">{err}</p>}

      {/* call shape */}
      <AnimatePresence>
        {calling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-void/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 14 }} animate={{ scale: 1, y: 0 }} className="w-[86%] max-w-xs rounded-3xl border border-line bg-void-700 p-5 text-center shadow-pop">
              <p className="mb-4 text-sm font-semibold text-ink">Call a shape</p>
              <div className="grid grid-cols-2 gap-3">
                {(["circle", "triangle", "cross", "square", "star"] as Shape[]).map((sh) => (
                  <button
                    key={sh}
                    onClick={() => {
                      const card = calling;
                      setCalling(null);
                      if (card) act({ type: "play", cardId: card.id, called: sh });
                    }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-void-800 py-4 transition-colors hover:bg-void-600"
                  >
                    <WhotShape shape={sh} size={22} />
                    <span className="text-sm font-semibold text-ink">{SHAPE_LABEL[sh]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* result */}
      <AnimatePresence>
        {finished && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 grid place-items-center bg-void/80 backdrop-blur-sm">
            <div className="text-center">
              <p className={cn("text-3xl font-black tracking-tight", iWon ? "text-teal" : "text-rose")}>{iWon ? "You win" : "You lose"}</p>
              <p className="mt-1 text-sm text-ink-dim">
                {view?.status === "settling" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Paying out
                  </span>
                ) : iWon ? (
                  "Pot paid to your wallet"
                ) : (
                  "Pot paid to opponent"
                )}
              </p>
              {view?.settleTx && (
                <a href={`${EXPLORER[view.chainId] ?? ""}${view.settleTx}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-ink">
                  View payout <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <div className="mt-4">
                <Link href="/" className="btn-primary inline-block rounded-xl px-5 py-2.5 text-sm shadow-glow">
                  Back to lobby
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
