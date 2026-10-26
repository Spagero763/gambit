"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  Shape,
  SHAPE_LABEL,
  WhotRules,
  DEFAULT_RULES,
  activeSpecials,
  buildDeck,
  isLegal,
  shuffle,
} from "@/lib/games/whot";
import { WhotCardBack, WhotCardFace, WhotShape } from "./WhotCard";
import { play } from "@/lib/sfx";
import { BOTS } from "@/lib/bots";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar, BotFace } from "@/components/Avatar";
import { Felt } from "@/components/art/Felt";
import { TurnDot } from "../TurnDot";
import { sheetEase } from "@/lib/motion";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface Seat {
  name: string;
  isBot: boolean;
}

type Pending = { amount: number; num: number } | null;

const AVATAR_BG = ["#5aa9ff", "#3ee09b", "#ffb547", "#ff5d6c", "#5fb7e6", "#9bd154"];

export function WhotTable({
  seats,
  title,
  rules = DEFAULT_RULES,
  onEnd,
}: {
  seats: Seat[];
  title: string;
  rules?: WhotRules;
  onEnd: (winnerName: string, youWon: boolean) => void;
}) {
  const n = seats.length;
  const specials = useMemo(() => activeSpecials(rules), [rules]);
  const seed = useRef(0);
  const rng = useCallback(() => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  }, []);

  // ----- mutable game state lives in refs so logic is synchronous and correct -----
  const hands = useRef<Card[][]>([]);
  const market = useRef<Card[]>([]);
  const pile = useRef<Card[]>([]);
  const active = useRef<Shape>("circle");
  const pendingRef = useRef<Pending>(null);
  const busy = useRef(false);
  const dealt = useRef(false);

  // mirror into state purely for rendering. `seq` also lets the bot effect
  // re-fire when an action keeps the same player on turn (Hold On, General
  // Market, Suspension in 1v1), otherwise setTurn(sameValue) is a no-op and
  // the bot would freeze after playing one of those.
  const [seq, force] = useState(0);
  const sync = () => force((x) => x + 1);

  const [turn, setTurn] = useState(0);
  const [calling, setCalling] = useState<Card | null>(null);
  const [log, setLog] = useState<{ text: string; who: number }[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [settings] = useSettings();
  const youName = settings.name || seats[0]?.name || "You";

  const pushLog = (text: string, who: number) => setLog((l) => [{ text, who }, ...l].slice(0, 5));

  // cards that were on screen last render; one of those that moves flies from
  // where it was instead of appearing from nowhere
  const shown = useRef<Set<string>>(new Set());
  const dealing = useRef(true);
  useEffect(() => {
    const s = new Set<string>();
    (hands.current[0] ?? []).forEach((c) => s.add(c.id));
    if (n === 2) (hands.current[1] ?? []).slice(0, 10).forEach((c) => s.add(c.id));
    if (market.current[0]) s.add(market.current[0].id);
    shown.current = s;
  });
  useEffect(() => {
    const t = setTimeout(() => (dealing.current = false), 1500);
    return () => clearTimeout(t);
  }, []);

  const top = () => pile.current[pile.current.length - 1];

  // deal once
  useEffect(() => {
    if (dealt.current) return;
    dealt.current = true;
    seed.current = (Date.now() % 100000) + 17;
    const deck = shuffle(buildDeck(), rng);
    const h: Card[][] = seats.map(() => []);
    let idx = 0;
    for (let k = 0; k < 6; k++) for (let p = 0; p < n; p++) h[p].push(deck[idx++]);
    let rest = deck.slice(idx);
    let startI = rest.findIndex((c) => c.shape !== "whot" && !specials.has(c.num));
    if (startI < 0) startI = 0;
    const start = rest[startI];
    rest = rest.filter((_, i) => i !== startI);
    hands.current = h;
    market.current = rest;
    pile.current = [start];
    active.current = start.shape;
    pendingRef.current = null;
    setTurn(0);
    setLog([{ text: "Cards dealt.", who: -1 }]);
    play("deal");
    sync();
  }, [seats, n, rng, specials]);

  const nextIndex = (from: number, step = 1) => (from + step) % n;

  // draw `count` cards from the market; reshuffle the discard pile in when empty
  const draw = useCallback(
    (count: number): Card[] => {
      const taken: Card[] = [];
      for (let i = 0; i < count; i++) {
        if (market.current.length === 0) {
          // reshuffle everything below the top discard back into the market
          if (pile.current.length > 1) {
            const keep = pile.current[pile.current.length - 1];
            market.current = shuffle(pile.current.slice(0, -1), rng);
            pile.current = [keep];
            pushLog("Market reshuffled.", -1);
          } else {
            break; // nothing left anywhere
          }
        }
        if (market.current.length === 0) break;
        taken.push(market.current[0]);
        market.current = market.current.slice(1);
      }
      return taken;
    },
    [rng]
  );

  // play a card from player `by`. Returns true if it ended the game.
  const resolvePlay = useCallback(
    (card: Card, by: number, called?: Shape): boolean => {
      const newShape = card.shape === "whot" ? called ?? "circle" : card.shape;
      hands.current[by] = hands.current[by].filter((c) => c.id !== card.id);
      pile.current = [...pile.current, card];
      active.current = newShape;
      play("place");

      const label = card.shape === "whot" ? `Whot, called ${SHAPE_LABEL[newShape]}` : `${card.num} ${SHAPE_LABEL[card.shape]}`;
      pushLog(`${seats[by].name}: ${label}`, by);

      // WIN: hand empty after a legal play
      if (hands.current[by].length === 0) {
        setWinner(by);
        sync();
        const youWon = by === 0 && !seats[0].isBot;
        play(youWon ? "win" : "lose");
        onEnd(seats[by].name, youWon);
        return true;
      }

      // effects (only those enabled by the active rules)
      let next = nextIndex(by);
      if (specials.has(card.num)) {
        if (card.num === 1) {
          next = by;
        } else if (card.num === 8) {
          next = nextIndex(by, 2);
        } else if (card.num === 14) {
          for (let i = 0; i < n; i++) {
            if (i === by) continue;
            hands.current[i] = [...hands.current[i], ...draw(1)];
          }
          next = by;
        } else if (card.num === 2) {
          pendingRef.current = { amount: 2, num: 2 };
        } else if (card.num === 5) {
          pendingRef.current = { amount: 3, num: 5 };
        }
      }
      setTurn(next);
      sync();
      return false;
    },
    [n, seats, specials, draw, onEnd]
  );

  // ---- human actions ----
  const playHuman = (card: Card) => {
    if (turn !== 0 || winner !== null || busy.current || calling) return;
    const pending = pendingRef.current;
    if (pending) {
      if (card.num === pending.num) {
        hands.current[0] = hands.current[0].filter((c) => c.id !== card.id);
        pile.current = [...pile.current, card];
        active.current = card.shape;
        pushLog(`${seats[0].name} stacked ${card.num}`, 0);
        if (hands.current[0].length === 0) {
          setWinner(0);
          sync();
          onEnd(seats[0].name, !seats[0].isBot);
          return;
        }
        pendingRef.current = { amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num };
        setTurn(nextIndex(0));
        sync();
      }
      return;
    }
    if (!isLegal(card, top()?.num ?? 0, active.current)) return;
    if (card.shape === "whot") {
      setCalling(card);
      return;
    }
    resolvePlay(card, 0);
  };

  const callShape = (shape: Shape) => {
    if (!calling) return;
    const card = calling;
    setCalling(null);
    resolvePlay(card, 0, shape);
  };

  const humanMarket = () => {
    if (turn !== 0 || winner !== null || busy.current || calling) return;
    const pending = pendingRef.current;
    if (pending) {
      hands.current[0] = [...hands.current[0], ...draw(pending.amount)];
      pushLog(`${seats[0].name} drew ${pending.amount}`, 0);
      pendingRef.current = null;
    } else {
      hands.current[0] = [...hands.current[0], ...draw(1)];
      pushLog(`${seats[0].name} went to market`, 0);
    }
    play("deal");
    setTurn(nextIndex(0));
    sync();
  };

  // ---- bot turns ----
  useEffect(() => {
    if (winner !== null) return;
    if (!seats[turn]?.isBot) return;
    const t = setTimeout(() => {
      busy.current = true;
      const hand = hands.current[turn];
      const pending = pendingRef.current;

      if (pending) {
        const match = hand.find((c) => c.num === pending.num);
        if (match) {
          hands.current[turn] = hand.filter((c) => c.id !== match.id);
          pile.current = [...pile.current, match];
          active.current = match.shape;
          pushLog(`${seats[turn].name} stacked ${match.num}`, turn);
          if (hands.current[turn].length === 0) {
            setWinner(turn);
            sync();
            onEnd(seats[turn].name, false);
            busy.current = false;
            return;
          }
          pendingRef.current = { amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num };
          setTurn(nextIndex(turn));
        } else {
          hands.current[turn] = [...hand, ...draw(pending.amount)];
          pushLog(`${seats[turn].name} drew ${pending.amount}`, turn);
          pendingRef.current = null;
          setTurn(nextIndex(turn));
        }
        busy.current = false;
        sync();
        return;
      }

      const legal = hand.filter((c) => isLegal(c, top()?.num ?? 0, active.current));
      const nonWhot = legal.filter((c) => c.shape !== "whot");
      let choice: Card | undefined;
      if (nonWhot.length) {
        const special = nonWhot.find((c) => specials.has(c.num));
        choice = special ?? nonWhot.sort((a, b) => b.num - a.num)[0];
      } else {
        choice = legal[0];
      }
      if (!choice) {
        hands.current[turn] = [...hand, ...draw(1)];
        pushLog(`${seats[turn].name} went to market`, turn);
        setTurn(nextIndex(turn));
        busy.current = false;
        sync();
        return;
      }
      if (choice.shape === "whot") {
        const counts: Record<string, number> = {};
        hand.forEach((c) => c.shape !== "whot" && (counts[c.shape] = (counts[c.shape] ?? 0) + 1));
        const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "circle") as Shape;
        resolvePlay(choice, turn, best);
      } else {
        resolvePlay(choice, turn);
      }
      busy.current = false;
    }, 640);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, seq]);

  const youHand = hands.current[0] ?? [];
  const pending = pendingRef.current;
  const youLegal = useMemo(() => {
    if (turn !== 0) return new Set<string>();
    const s = new Set<string>();
    youHand.forEach((c) => {
      if (pending ? c.num === pending.num : isLegal(c, top()?.num ?? 0, active.current)) s.add(c.id);
    });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, youHand, pending]);

  const fan = (i: number, total: number) => {
    const spread = Math.min(7, 40 / Math.max(1, total));
    const mid = (total - 1) / 2;
    return { rot: (i - mid) * spread, y: Math.abs(i - mid) * 4 };
  };

  if (hands.current.length === 0) return null;
  const t = top();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
        <Link href="/" data-nav="back" aria-label="Back to games" className="glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="display min-w-0 flex-1 truncate text-[22px] font-extrabold text-ink">{title}</h1>
      </div>

      {/* opponents */}
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        {seats.slice(1).map((op, oi) => {
          const pi = oi + 1;
          const isActive = turn === pi && winner === null;
          const hand = hands.current[pi] ?? [];
          const persona = BOTS.find((b) => b.name === op.name);
          return (
            <div key={pi} data-on={isActive ? "them" : undefined} className="seat flex min-w-0 flex-1 basis-[30%] items-center gap-2 rounded-[16px] px-2.5 py-2">
              {persona ? (
                <BotFace bot={persona} size={30} rounded="rounded-lg" />
              ) : (
                <span className="grid h-[30px] w-[30px] place-items-center rounded-lg text-[12px] font-semibold text-void" style={{ background: AVATAR_BG[pi % AVATAR_BG.length] }}>
                  {op.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink">{op.name}</p>
                <p className={cn("nums flex items-center gap-1.5 text-[12px]", isActive ? "text-them" : "text-ink-faint")}>
                  {isActive && <TurnDot />}
                  {isActive ? "Thinking" : `${hand.length} ${hand.length === 1 ? "card" : "cards"}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* table */}
      <div className="relative my-3 flex flex-1 items-center justify-center gap-10 rounded-[36px] py-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <Felt />
        {seats.length === 2 && (
          <div aria-hidden className="absolute inset-x-0 top-5 flex justify-center -space-x-5">
            {(hands.current[1] ?? []).slice(0, 10).map((c, i, arr) => (
              <motion.div
                key={c.id}
                layoutId={`card-${c.id}`}
                initial={shown.current.has(c.id) ? false : { opacity: 0 }}
                animate={{ opacity: 1, rotate: ((arr.length - 1) / 2 - i) * 5, y: -Math.abs(i - (arr.length - 1) / 2) * 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="h-[52px] w-[36px]"
                style={{ transformOrigin: "50% 0%" }}
              >
                <WhotCardBack />
              </motion.div>
            ))}
          </div>
        )}
        <button onClick={humanMarket} disabled={turn !== 0 || winner !== null || !!calling} className="pressable relative flex flex-col items-center gap-2 disabled:opacity-60">
          <div className="relative h-[112px] w-[78px]">
            <div className="absolute inset-0 translate-x-1 translate-y-1"><WhotCardBack /></div>
            {market.current[0] ? (
              <motion.div key={market.current[0].id} layoutId={`card-${market.current[0].id}`} initial={false} className="absolute inset-0">
                <WhotCardBack />
              </motion.div>
            ) : (
              <div className="absolute inset-0"><WhotCardBack /></div>
            )}
          </div>
          <span className="nums text-[12px] font-semibold text-white/75">Market {market.current.length}</span>
        </button>

        <div className="relative flex flex-col items-center gap-2">
          <div data-coach="pile" className="relative z-30 h-[112px] w-[78px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.45)]">
            <AnimatePresence mode="popLayout">
              {t && (
                <motion.div
                  key={t.id}
                  layoutId={`card-${t.id}`}
                  initial={shown.current.has(t.id) ? false : { y: -120, rotate: -10, opacity: 0 }}
                  animate={{ y: 0, rotate: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="absolute inset-0 z-10"
                >
                  <WhotCardFace shape={t.shape} num={t.num} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/75">
            <WhotShape shape={active.current} size={13} color="#f6efe1" /> {SHAPE_LABEL[active.current]}
          </span>
        </div>
      </div>

      {/* status */}
      <div className="mb-2 flex h-8 items-center justify-center text-center">
        {pending ? (
          <span className="rounded-full bg-rose/15 px-4 py-1.5 text-[13px] font-semibold text-rose">Pick {pending.amount}, or answer with a {pending.num}</span>
        ) : (
          <span className={cn("text-[14px]", turn === 0 && winner === null ? "font-semibold text-you" : "text-ink-dim")}>
            {turn === 0 ? "Your turn" : `${seats[turn]?.name} is playing`}
          </span>
        )}
      </div>

      {/* you */}
      <div data-on={turn === 0 && winner === null ? "you" : undefined} className="seat flex items-center gap-2.5 rounded-[16px] px-3 py-2">
        <Avatar
          image={settings.avatarImage || undefined}
          color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal}
          name={youName}
          size={30}
          rounded="rounded-lg"
        />
        <span className="flex-1 truncate text-[14px] font-semibold text-ink">{youName}</span>
        <span className="nums text-[12px] text-ink-faint">
          {youHand.length} {youHand.length === 1 ? "card" : "cards"}
        </span>
      </div>

      {/* your hand */}
      <div data-coach="hand" className="relative mt-2 flex h-[132px] items-end justify-center">
        {youHand.map((c, i) => {
          const { rot, y } = fan(i, youHand.length);
          const legal = youLegal.has(c.id);
          return (
            <motion.button
              key={c.id}
              layout
              layoutId={`card-${c.id}`}
              onClick={() => playHuman(c)}
              initial={shown.current.has(c.id) ? false : dealing.current ? { y: 60, opacity: 0 } : { x: -60, y: -220, rotate: -10, opacity: 0 }}
              animate={{ x: 0, y: y - (legal ? 14 : 0), opacity: 1, rotate: rot }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: dealing.current ? i * 0.07 : 0 }}
              style={{
                transformOrigin: "50% 110%",
                marginLeft: i === 0 ? 0 : youHand.length > 7 ? -38 : youHand.length > 5 ? -30 : -22,
                zIndex: i,
              }}
              aria-label={`${c.shape === "whot" ? "Whot 20" : `${SHAPE_LABEL[c.shape]} ${c.num}`}${legal ? ", playable" : ""}`}
              className={cn("h-[112px] w-[78px] shrink-0", turn === 0 && !legal && "opacity-50")}
            >
              <div className={cn("h-full w-full rounded-[10px]", legal && "shadow-[0_0_0_2px_rgba(62,224,155,0.85),0_10px_24px_-8px_rgba(62,224,155,0.6)]")}>
                <WhotCardFace shape={c.shape} num={c.num} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* log */}
      <div className="mt-3 h-6 overflow-hidden text-center">
        <AnimatePresence mode="popLayout">
          {log[0] && (
            <motion.p key={log[0].text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-[12px] text-ink-faint">
              {log[0].text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

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
                  <button key={sh} onClick={() => callShape(sh)} aria-label={SHAPE_LABEL[sh]} className="pressable grid aspect-square place-items-center rounded-[14px] bg-whot-cream">
                    <WhotShape shape={sh} size={30} />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
