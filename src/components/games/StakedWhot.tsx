"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchWhot, whotAction, WhotView } from "@/lib/matchClient";
import { Card, Shape, SHAPE_LABEL, isLegal } from "@/lib/games/whot";
import { WhotCardBack, WhotCardFace, WhotShape } from "./whot/WhotCard";
import { SettleOverlay } from "./SettleOverlay";
import { ResignButton } from "./ResignButton";
import { TimeoutClaim } from "./TimeoutClaim";
import { MatchChat } from "./MatchChat";
import { StakedHeader, MoneySeat, ResultLayer } from "./StakedChrome";
import { Felt } from "@/components/art/Felt";
import { sheetEase } from "@/lib/motion";
import { play } from "@/lib/sfx";
import { useProfiles, displayName, avatarHex } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/cn";

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

export function StakedWhot({ matchId, you, onExit }: { matchId: bigint; you: `0x${string}`; onExit?: () => void }) {
  const me = you.toLowerCase();
  const [view, setView] = useState<WhotView | null>(null);
  const oppAddr = view?.order.find((a) => a !== me) ?? null;
  const oppProfiles = useProfiles(oppAddr ? [oppAddr] : []);
  const oppName = oppAddr ? displayName(oppAddr, oppProfiles[oppAddr.toLowerCase()]) : "Opponent";
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

  // survival table (3+ seats): placements lock in as players empty their hands
  const order = view?.order ?? [];
  const multi = order.length > 2;
  const placements = view?.finished ?? [];
  const myPlace = me ? placements.indexOf(me) : -1;
  const others = order.filter((a) => a !== me);
  const otherProfiles = useProfiles(others);
  const tournamentId = Number(matchId) >= 1_000_000_000_000 ? Math.floor((Number(matchId) - 1_000_000_000_000) / 10) : null;
  const MEDALS = ["🥇", "🥈", "🥉"];

  // celebratory chime the moment your placement locks at the table
  const placedRef = useRef(false);
  useEffect(() => {
    if (myPlace >= 0 && !placedRef.current) {
      placedRef.current = true;
      play("win");
    }
  }, [myPlace]);

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

  // your cards from the last render: a played one flies to the pile, a new one
  // comes from the market, and the first hand deals in one card at a time
  const shown = useRef<Set<string> | null>(null);
  const [dealing, setDealing] = useState(true);
  const hasView = !!view;
  useEffect(() => {
    if (view) shown.current = new Set(hand.map((c) => c.id));
  });
  useEffect(() => {
    if (!hasView) return;
    const t = setTimeout(() => setDealing(false), 1500);
    return () => clearTimeout(t);
  }, [hasView]);
  const enterFrom = (id: string) =>
    shown.current === null ? { y: 60, opacity: 0 } : shown.current.has(id) ? false : { x: -60, y: -220, rotate: -10, opacity: 0 };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <StakedHeader
        title="Naija Whot"
        matchId={matchId}
        onExit={onExit}
        right={view?.status === "active" ? <ResignButton matchId={matchId} you={me} /> : null}
      />

      {/* opponents: one seat for 1v1, seat chips around the table for 3+ */}
      {multi ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {others.map((a) => {
            const p = otherProfiles[a.toLowerCase()];
            const placeI = placements.indexOf(a);
            const theirTurn = view?.status === "active" && view?.turn === a;
            return (
              <div
                key={a}
                data-on={theirTurn ? "them" : undefined}
                className={cn("seat flex items-center gap-1.5 rounded-full px-2.5 py-1.5", placeI >= 0 && "opacity-60")}
              >
                <Avatar image={p?.avatar_image || undefined} color={avatarHex(p)} name={displayName(a, p)} size={20} rounded="rounded-md" />
                <span className="max-w-[72px] truncate text-[14px] font-semibold text-ink">{displayName(a, p)}</span>
                <span className="nums text-[14px] text-ink-faint">
                  {placeI >= 0 ? MEDALS[placeI] ?? "✔" : `${view?.counts?.[a] ?? 0}🂠`}
                </span>
                {theirTurn && <span className="h-1.5 w-1.5 rounded-full bg-teal" />}
              </div>
            );
          })}
        </div>
      ) : (
        <MoneySeat role="them" name={oppName} detail={`${oppCount} ${oppCount === 1 ? "card" : "cards"}`} active={view?.status === "active" && !myTurn} />
      )}

      {/* your locked placement while the table plays on */}
      {multi && myPlace >= 0 && !finished && (
        <p className="mt-2 text-center text-[14px] font-semibold text-teal">
          {MEDALS[myPlace] ?? "✔"} You finished {["1st", "2nd", "3rd"][myPlace] ?? `${myPlace + 1}th`}. The table plays on.
        </p>
      )}

      {/* table */}
      <div className="relative my-3 flex flex-1 items-center justify-center gap-10 rounded-[36px] py-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <Felt />
        {!multi && oppCount > 0 && (
          <div aria-hidden className="absolute inset-x-0 top-5 flex justify-center -space-x-5">
            {Array.from({ length: Math.min(10, oppCount) }).map((_, i, arr) => (
              <div
                key={i}
                className="h-[52px] w-[36px]"
                style={{ transformOrigin: "50% 0%", transform: `rotate(${((arr.length - 1) / 2 - i) * 5}deg) translateY(${-Math.abs(i - (arr.length - 1) / 2) * 2}px)` }}
              >
                <WhotCardBack />
              </div>
            ))}
          </div>
        )}
        <button onClick={() => act({ type: "draw" })} disabled={!myTurn || busy || !!calling} className="pressable relative flex flex-col items-center gap-2 disabled:opacity-60">
          <div className="relative h-[112px] w-[78px]">
            <div className="absolute inset-0 translate-x-1 translate-y-1">
              <WhotCardBack />
            </div>
            <div className="absolute inset-0">
              <WhotCardBack />
            </div>
          </div>
          <span className="text-[14px] font-semibold text-white/75">{pending ? `Pick ${pending.amount}` : "Market"}</span>
        </button>

        <div className="relative flex flex-col items-center gap-2">
          <div className="relative z-30 h-[112px] w-[78px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.45)]">
            <AnimatePresence mode="popLayout">
              {top && (
                <motion.div
                  key={top.id}
                  layoutId={`card-${top.id}`}
                  initial={shown.current?.has(top.id) ? false : { y: -120, rotate: -10, opacity: 0 }}
                  animate={{ y: 0, rotate: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="absolute inset-0"
                >
                  <WhotCardFace shape={top.shape} num={top.num} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {active && (
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/75">
              <WhotShape shape={active} size={13} color="#f6efe1" /> {SHAPE_LABEL[active]}
            </span>
          )}
        </div>
      </div>

      {/* status */}
      <div className="mb-2 flex min-h-8 flex-col items-center justify-center text-center">
        {pending ? (
          <span className="rounded-full bg-rose/15 px-4 py-1.5 text-[14px] font-semibold text-rose">{status}</span>
        ) : (
          <span className={cn("text-[14px]", myTurn ? "font-semibold text-you" : "text-ink-dim")}>{status}</span>
        )}
        {!multi && <TimeoutClaim matchId={matchId} me={me} turn={view?.turn} updatedAt={view?.updatedAt} status={view?.status} />}
      </div>

      {!multi && <MoneySeat role="you" name="You" detail={`${hand.length} ${hand.length === 1 ? "card" : "cards"}`} active={myTurn} />}
      <MatchChat matchId={matchId} me={me} />

      {/* your hand */}
      <div className="relative mt-2 flex h-[132px] items-end justify-center">
        {hand.map((c, i) => {
          const { rot, y } = fan(i, hand.length);
          const legal = myTurn && legalId(c);
          return (
            <motion.button
              key={c.id}
              layout
              layoutId={`card-${c.id}`}
              onClick={() => playCard(c)}
              initial={enterFrom(c.id)}
              animate={{ x: 0, y: y - (legal ? 14 : 0), opacity: 1, rotate: rot }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: dealing ? i * 0.07 : 0 }}
              style={{
                transformOrigin: "50% 110%",
                marginLeft: i === 0 ? 0 : hand.length > 7 ? -38 : hand.length > 5 ? -30 : -22,
                zIndex: i,
              }}
              aria-label={`${c.shape === "whot" ? "Whot 20" : `${SHAPE_LABEL[c.shape]} ${c.num}`}${legal ? ", playable" : ""}`}
              className={cn("h-[112px] w-[78px] shrink-0", myTurn && !legal && "opacity-50")}
            >
              <div className={cn("h-full w-full rounded-[10px]", legal && "shadow-[0_0_0_2px_rgba(62,224,155,0.85),0_10px_24px_-8px_rgba(62,224,155,0.6)]")}>
                <WhotCardFace shape={c.shape} num={c.num} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {err && <p role="alert" className="mt-2 text-center text-[14px] text-rose">{err}</p>}

      {/* call shape */}
      <AnimatePresence>
        {calling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end bg-black/60">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.32, ease: sheetEase }}
              className="sheet mx-auto w-full max-w-md rounded-t-[30px] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-6"
            >
              <p className="display text-[24px] font-extrabold text-ink">I need...</p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {(["circle", "triangle", "cross", "square", "star"] as Shape[]).map((sh) => (
                  <button
                    key={sh}
                    onClick={() => {
                      const card = calling;
                      setCalling(null);
                      if (card) act({ type: "play", cardId: card.id, called: sh });
                    }}
                    aria-label={SHAPE_LABEL[sh]}
                    className="pressable grid aspect-square place-items-center rounded-[14px] bg-whot-cream"
                  >
                    <WhotShape shape={sh} size={30} />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* result, table games show your placement; 1v1 shows the payout flow */}
      <AnimatePresence>
        {finished && multi && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 grid place-items-center bg-black/65 px-5">
            <div className="panel w-full max-w-sm rounded-[28px] p-6 text-center">
              <p className="text-3xl">{myPlace >= 0 && myPlace < 3 ? MEDALS[myPlace] : "🃏"}</p>
              <p className="display mt-1 text-[28px] font-extrabold text-ink">
                {myPlace === 0 ? "Champion!" : myPlace > 0 ? `You placed ${["1st", "2nd", "3rd"][myPlace] ?? `${myPlace + 1}th`}` : "Table over"}
              </p>
              <p className="mt-1 text-sm text-ink-dim">
                {myPlace >= 0 && myPlace < 3 ? "Your prize is paid from the cup escrow." : "No prize this time. Run it back."}
              </p>
              {tournamentId !== null && (
                <Link href={`/tournament/${tournamentId}`} className="btn-primary pressable mt-5 flex h-12 w-full items-center justify-center rounded-full text-[15px]">
                  Back to the cup
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ResultLayer open={finished && !multi}>
        <SettleOverlay
          result={iWon ? "win" : "lose"}
          status={view?.status ?? "settling"}
          settleTx={view?.settleTx}
          settleError={view?.settleError}
          chainId={view?.chainId}
          matchId={matchId}
          shareAddress={me}
          stakeWei={view?.stake}
          decimals={view?.decimals}
          token={view?.token}
        />
      </ResultLayer>
    </div>
  );
}
