"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Shape, SHAPE_LABEL, buildDeck, isLegal, shuffle } from "@/lib/games/whot";
import { WhotCardBack, WhotCardFace, WhotShape } from "./WhotCard";
import { cn } from "@/lib/cn";

export interface Seat {
  name: string;
  isBot: boolean;
}

interface Player {
  name: string;
  isBot: boolean;
  hand: Card[];
}

type Pending = { amount: number; num: number } | null;

const AVATAR_BG = [
  "from-violet to-violet-deep",
  "from-teal-deep to-[#0b5e46]",
  "from-amber to-[#b9742a]",
  "from-rose to-[#b13a63]",
  "from-[#7fd7ff] to-[#2a6f9e]",
  "from-[#c08bff] to-[#6a3aa8]",
];

export function WhotTable({
  seats,
  title,
  onEnd,
}: {
  seats: Seat[];
  title: string;
  onEnd: (winnerName: string, youWon: boolean) => void;
}) {
  const n = seats.length;
  const seed = useRef(0);
  const rng = useCallback(() => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  }, []);

  const [players, setPlayers] = useState<Player[]>([]);
  const [market, setMarket] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [activeShape, setActiveShape] = useState<Shape>("circle");
  const [turn, setTurn] = useState(0);
  const [pending, setPending] = useState<Pending>(null);
  const [calling, setCalling] = useState<Card | null>(null);
  const [log, setLog] = useState<{ text: string; who: number }[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const busy = useRef(false);
  const dealt = useRef(false);

  const top = pile[pile.length - 1];
  const topNum = top?.num ?? 0;

  const pushLog = (text: string, who: number) => setLog((l) => [{ text, who }, ...l].slice(0, 5));

  // deal once
  useEffect(() => {
    if (dealt.current) return;
    dealt.current = true;
    seed.current = (Date.now() % 100000) + 17;
    const deck = shuffle(buildDeck(), rng);
    const hands: Player[] = seats.map((s) => ({ name: s.name, isBot: s.isBot, hand: [] }));
    let idx = 0;
    for (let k = 0; k < 6; k++) for (let p = 0; p < n; p++) hands[p].hand.push(deck[idx++]);
    let rest = deck.slice(idx);
    let startI = rest.findIndex((c) => c.shape !== "whot" && ![1, 2, 5, 8, 14].includes(c.num));
    if (startI < 0) startI = 0;
    const start = rest[startI];
    rest = rest.filter((_, i) => i !== startI);
    setPlayers(hands);
    setMarket(rest);
    setPile([start]);
    setActiveShape(start.shape);
    setTurn(0);
    setLog([{ text: "Cards dealt.", who: -1 }]);
  }, [seats, n, rng]);

  const draw = useCallback(
    (count: number): Card[] => {
      const taken: Card[] = [];
      setMarket((m) => {
        let pool = m;
        for (let i = 0; i < count; i++) {
          if (pool.length === 0) {
            setPile((p) => {
              if (p.length <= 1) return p;
              pool = shuffle(p.slice(0, -1), rng);
              return [p[p.length - 1]];
            });
          }
          if (pool.length === 0) break;
          taken.push(pool[0]);
          pool = pool.slice(1);
        }
        return pool;
      });
      return taken;
    },
    [rng]
  );

  const giveCards = (pi: number, cards: Card[]) =>
    setPlayers((ps) => ps.map((p, i) => (i === pi ? { ...p, hand: [...p.hand, ...cards] } : p)));

  const nextIndex = (from: number, step = 1) => (from + step) % n;

  const resolvePlay = useCallback(
    (card: Card, by: number, called?: Shape) => {
      const newShape = card.shape === "whot" ? called ?? "circle" : card.shape;
      setPile((p) => [...p, card]);
      setActiveShape(newShape);

      let emptied = false;
      setPlayers((ps) =>
        ps.map((p, i) => {
          if (i !== by) return p;
          const hand = p.hand.filter((c) => c.id !== card.id);
          if (hand.length === 0) emptied = true;
          return { ...p, hand };
        })
      );

      const label = card.shape === "whot" ? `Whot, called ${SHAPE_LABEL[newShape]}` : `${card.num} ${SHAPE_LABEL[card.shape]}`;
      pushLog(`${seats[by].name}: ${label}`, by);

      if (emptied) {
        setWinner(by);
        onEnd(seats[by].name, by === 0 && !seats[0].isBot);
        busy.current = false;
        return;
      }

      // effects
      let next = nextIndex(by);
      switch (card.num) {
        case 1: // hold on
          next = by;
          break;
        case 8: // suspension -> skip one
          next = nextIndex(by, 2);
          break;
        case 14: { // general market: everyone else draws 1, play again
          for (let i = 0; i < n; i++) {
            if (i === by) continue;
            const d = draw(1);
            giveCards(i, d);
          }
          next = by;
          break;
        }
        case 2:
          setPending({ amount: 2, num: 2 });
          break;
        case 5:
          setPending({ amount: 3, num: 5 });
          break;
      }
      setTurn(next);
      busy.current = false;
    },
    [n, seats, draw, onEnd]
  );

  // human plays a card
  const playHuman = (card: Card) => {
    if (turn !== 0 || winner !== null || busy.current || calling) return;
    if (pending) {
      if (card.num === pending.num) {
        busy.current = true;
        setPlayers((ps) => ps.map((p, i) => (i === 0 ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) } : p)));
        setPile((p) => [...p, card]);
        setActiveShape(card.shape);
        setPending({ amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num });
        pushLog(`${seats[0].name} stacked ${card.num}`, 0);
        setTurn(nextIndex(0));
        busy.current = false;
      }
      return;
    }
    if (!isLegal(card, topNum, activeShape)) return;
    if (card.shape === "whot") {
      setCalling(card);
      return;
    }
    busy.current = true;
    resolvePlay(card, 0);
  };

  const callShape = (shape: Shape) => {
    if (!calling) return;
    busy.current = true;
    const card = calling;
    setCalling(null);
    resolvePlay(card, 0, shape);
  };

  const humanMarket = () => {
    if (turn !== 0 || winner !== null || busy.current || calling) return;
    busy.current = true;
    if (pending) {
      giveCards(0, draw(pending.amount));
      pushLog(`${seats[0].name} drew ${pending.amount}`, 0);
      setPending(null);
    } else {
      giveCards(0, draw(1));
      pushLog(`${seats[0].name} went to market`, 0);
    }
    setTurn(nextIndex(0));
    busy.current = false;
  };

  // bot turns
  useEffect(() => {
    if (winner !== null) return;
    if (!seats[turn]?.isBot) return;
    const t = setTimeout(() => {
      busy.current = true;
      const me = players[turn];
      if (!me) {
        busy.current = false;
        return;
      }
      if (pending) {
        const match = me.hand.find((c) => c.num === pending.num);
        if (match) {
          setPlayers((ps) => ps.map((p, i) => (i === turn ? { ...p, hand: p.hand.filter((c) => c.id !== match.id) } : p)));
          setPile((p) => [...p, match]);
          setActiveShape(match.shape);
          setPending({ amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num });
          pushLog(`${seats[turn].name} stacked ${match.num}`, turn);
          setTurn(nextIndex(turn));
        } else {
          giveCards(turn, draw(pending.amount));
          pushLog(`${seats[turn].name} drew ${pending.amount}`, turn);
          setPending(null);
          setTurn(nextIndex(turn));
        }
        busy.current = false;
        return;
      }

      const legal = me.hand.filter((c) => isLegal(c, topNum, activeShape));
      const nonWhot = legal.filter((c) => c.shape !== "whot");
      let choice: Card | undefined;
      if (nonWhot.length) {
        const special = nonWhot.find((c) => [1, 2, 5, 8, 14].includes(c.num));
        choice = special ?? nonWhot.sort((a, b) => b.num - a.num)[0];
      } else {
        choice = legal[0];
      }
      if (!choice) {
        giveCards(turn, draw(1));
        pushLog(`${seats[turn].name} went to market`, turn);
        setTurn(nextIndex(turn));
        busy.current = false;
        return;
      }
      if (choice.shape === "whot") {
        const counts: Record<string, number> = {};
        me.hand.forEach((c) => c.shape !== "whot" && (counts[c.shape] = (counts[c.shape] ?? 0) + 1));
        const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "circle") as Shape;
        resolvePlay(choice, turn, best);
      } else {
        resolvePlay(choice, turn);
      }
    }, 640);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, pending, players, topNum, activeShape]);

  const you = players[0];
  const youLegal = useMemo(() => {
    if (turn !== 0 || !you) return new Set<string>();
    const s = new Set<string>();
    you.hand.forEach((c) => {
      if (pending ? c.num === pending.num : isLegal(c, topNum, activeShape)) s.add(c.id);
    });
    return s;
  }, [you, turn, pending, topNum, activeShape]);

  const fan = (i: number, total: number) => {
    const spread = Math.min(7, 40 / Math.max(1, total));
    const mid = (total - 1) / 2;
    return { rot: (i - mid) * spread, y: Math.abs(i - mid) * 4 };
  };

  if (!you) return null;
  const opponents = players.slice(1);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-faint">{title}</p>

      {/* opponents */}
      <div className="mt-3 flex flex-wrap items-start justify-center gap-2">
        {opponents.map((op, oi) => {
          const pi = oi + 1;
          const active = turn === pi && winner === null;
          return (
            <div
              key={pi}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all",
                active ? "glass ring-1 ring-teal/40" : "bg-white/[0.02]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white", AVATAR_BG[pi % AVATAR_BG.length])}>
                  {op.name.slice(0, 1)}
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-bold text-ink">{op.name}</p>
                  <p className="text-[9px] text-ink-faint">{op.hand.length} cards</p>
                </div>
              </div>
              <div className="flex -space-x-3.5">
                {op.hand.slice(0, 6).map((c, i) => (
                  <div key={c.id} className="h-8 w-[22px]" style={{ transform: `rotate(${(i - 2.5) * 5}deg)` }}>
                    <WhotCardBack />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* table */}
      <div className="mt-4 flex flex-1 items-center justify-center gap-6">
        <button onClick={humanMarket} disabled={turn !== 0 || winner !== null || !!calling} className="flex flex-col items-center gap-1.5 disabled:opacity-50">
          <div className="relative h-24 w-16">
            <div className="absolute inset-0 translate-x-1 translate-y-1"><WhotCardBack /></div>
            <div className="absolute inset-0"><WhotCardBack /></div>
          </div>
          <span className="text-[10px] font-semibold text-ink-dim">Market · {market.length}</span>
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
          <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-dim">
            <WhotShape shape={activeShape} size={12} /> {SHAPE_LABEL[activeShape]}
          </span>
        </div>
      </div>

      {/* status */}
      <div className="mb-2 text-center">
        {pending ? (
          <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-bold text-rose">Pick {pending.amount} or stack a {pending.num}</span>
        ) : (
          <span className="text-sm text-ink-dim">{turn === 0 ? "Your move" : `${seats[turn]?.name} is playing`}</span>
        )}
      </div>

      {/* your hand */}
      <div className="relative flex h-32 items-end justify-center">
        {you.hand.map((c, i) => {
          const { rot, y } = fan(i, you.hand.length);
          const legal = youLegal.has(c.id);
          return (
            <motion.button
              key={c.id}
              onClick={() => playHuman(c)}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y, opacity: 1, rotate: rot }}
              whileHover={legal ? { y: y - 18, scale: 1.05 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{ transformOrigin: "bottom center", marginLeft: i === 0 ? 0 : -20, zIndex: legal ? 20 + i : i }}
              className={cn("h-28 w-[64px] shrink-0", turn === 0 && !legal && "opacity-55")}
            >
              <div className={cn("h-full w-full rounded-xl", legal && "ring-2 ring-teal/80")}>
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
            <motion.p key={log[0].text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-xs text-ink-faint">
              {log[0].text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* call shape */}
      <AnimatePresence>
        {calling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-void/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 14 }} animate={{ scale: 1, y: 0 }} className="w-[86%] max-w-xs rounded-3xl glass p-5 text-center shadow-card">
              <p className="mb-4 text-sm font-bold text-ink">Call a shape</p>
              <div className="grid grid-cols-2 gap-3">
                {(["circle", "triangle", "cross", "square", "star"] as Shape[]).map((sh) => (
                  <button key={sh} onClick={() => callShape(sh)} className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 ring-1 ring-white/10 transition-colors hover:bg-white/10">
                    <WhotShape shape={sh} size={22} />
                    <span className="text-sm font-semibold text-ink">{SHAPE_LABEL[sh]}</span>
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
