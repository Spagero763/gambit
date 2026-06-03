"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import {
  Card,
  Shape,
  SHAPE_LABEL,
  buildDeck,
  handScore,
  isLegal,
  shuffle,
} from "@/lib/games/whot";
import { WhotCardBack, WhotCardFace, WhotShape } from "./WhotCard";
import { cn } from "@/lib/cn";

type Who = "you" | "ai";
type Pending = { type: "pick"; amount: number; num: number } | null;

interface Log {
  text: string;
  tone: "you" | "ai" | "sys";
}

export function WhotGame() {
  const seed = useRef(0);
  const rng = useCallback(() => {
    seed.current = (seed.current * 1103515245 + 12345) & 0x7fffffff;
    return seed.current / 0x7fffffff;
  }, []);

  const [you, setYou] = useState<Card[]>([]);
  const [ai, setAi] = useState<Card[]>([]);
  const [market, setMarket] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [activeShape, setActiveShape] = useState<Shape>("circle");
  const [turn, setTurn] = useState<Who>("you");
  const [pending, setPending] = useState<Pending>(null);
  const [calling, setCalling] = useState<Card | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const [winner, setWinner] = useState<Who | null>(null);
  const [scores, setScores] = useState<{ you: number; ai: number } | null>(null);
  const busy = useRef(false);

  const top = pile[pile.length - 1];
  const topNum = top?.num ?? 0;

  const pushLog = (text: string, tone: Log["tone"]) =>
    setLog((l) => [{ text, tone }, ...l].slice(0, 6));

  const deal = useCallback(() => {
    seed.current = (Date.now() % 100000) + 17;
    let deck = shuffle(buildDeck(), rng);
    const y = deck.slice(0, 6);
    const a = deck.slice(6, 12);
    let rest = deck.slice(12);
    // first non-whot, non-special card starts the pile to avoid an opening action
    let idx = rest.findIndex((c) => c.shape !== "whot" && ![1, 2, 5, 8, 14].includes(c.num));
    if (idx < 0) idx = 0;
    const start = rest[idx];
    rest = rest.filter((_, i) => i !== idx);
    setYou(y);
    setAi(a);
    setMarket(rest);
    setPile([start]);
    setActiveShape(start.shape);
    setTurn("you");
    setPending(null);
    setCalling(null);
    setWinner(null);
    setScores(null);
    setLog([{ text: "Cards dealt. Your move.", tone: "sys" }]);
    busy.current = false;
  }, [rng]);

  useEffect(() => {
    deal();
  }, [deal]);

  const drawFrom = useCallback(
    (src: Card[], n: number): [Card[], Card[]] => {
      let m = src;
      const taken: Card[] = [];
      for (let i = 0; i < n; i++) {
        if (m.length === 0) {
          // reshuffle pile (except top) into market
          if (pile.length > 1) {
            const top = pile[pile.length - 1];
            m = shuffle(pile.slice(0, -1), rng);
            setPile([top]);
          } else break;
        }
        taken.push(m[0]);
        m = m.slice(1);
      }
      return [taken, m];
    },
    [pile, rng]
  );

  const checkWin = (who: Who, hand: Card[]) => {
    if (hand.length === 0) {
      setWinner(who);
      const yourScore = handScore(who === "you" ? [] : you);
      const aiScore = handScore(who === "ai" ? [] : ai);
      // recompute against the loser's remaining hand
      const loserHand = who === "you" ? ai : you;
      setScores({
        you: who === "you" ? 0 : handScore(you),
        ai: who === "ai" ? 0 : handScore(ai),
      });
      void yourScore;
      void aiScore;
      void loserHand;
      return true;
    }
    return false;
  };

  // apply the effect of a played card; returns who plays next
  const applyEffect = useCallback(
    (card: Card, by: Who): Who => {
      const other: Who = by === "you" ? "ai" : "you";
      switch (card.num) {
        case 1: // Hold On -> in 2p, same player again
        case 8: // Suspension -> skip opponent, same player again
          pushLog(`${by === "you" ? "You" : "AI"} played ${card.num} (${card.num === 1 ? "Hold On" : "Suspension"}). Go again.`, by);
          return by;
        case 2:
          setPending({ type: "pick", amount: 2, num: 2 });
          pushLog(`${by === "you" ? "You" : "AI"} played Pick Two.`, by);
          return other;
        case 5:
          setPending({ type: "pick", amount: 3, num: 5 });
          pushLog(`${by === "you" ? "You" : "AI"} played Pick Three.`, by);
          return other;
        case 14: {
          // General Market: opponent draws 1, you play again
          const [taken, m] = drawFrom(market, 1);
          setMarket(m);
          if (other === "you") setYou((h) => [...h, ...taken]);
          else setAi((h) => [...h, ...taken]);
          pushLog(`${by === "you" ? "You" : "AI"} played General Market. ${other === "you" ? "You draw" : "AI draws"} 1.`, by);
          return by;
        }
        default:
          return other;
      }
    },
    [drawFrom, market]
  );

  const finishPlay = useCallback(
    (card: Card, by: Who, calledShape?: Shape) => {
      setPile((p) => [...p, card]);
      const newShape = card.shape === "whot" ? calledShape ?? "circle" : card.shape;
      setActiveShape(newShape);

      const handAfter = (by === "you" ? you : ai).filter((c) => c.id !== card.id);
      if (by === "you") setYou(handAfter);
      else setAi(handAfter);

      if (card.shape === "whot") {
        pushLog(`${by === "you" ? "You" : "AI"} played Whot, called ${SHAPE_LABEL[newShape]}.`, by);
      } else if (![1, 2, 5, 8, 14].includes(card.num)) {
        pushLog(`${by === "you" ? "You" : "AI"} played ${card.num} ${SHAPE_LABEL[card.shape]}.`, by);
      }

      if (handAfter.length === 0) {
        setWinner(by);
        setScores({ you: by === "you" ? 0 : handScore(you.filter((c) => c.id !== card.id)), ai: by === "ai" ? 0 : handScore(ai.filter((c) => c.id !== card.id)) });
        busy.current = false;
        return;
      }

      const next = applyEffect(card, by);
      setTurn(next);
      busy.current = false;
    },
    [you, ai, applyEffect]
  );

  // ---- player actions ----
  const playCard = (card: Card) => {
    if (turn !== "you" || winner || busy.current || calling) return;

    if (pending) {
      // must answer with same number or draw
      if (card.num === pending.num) {
        busy.current = true;
        setPending({ type: "pick", amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num });
        // stacking: the pending grows and passes on
        setPile((p) => [...p, card]);
        setActiveShape(card.shape);
        setYou((h) => h.filter((c) => c.id !== card.id));
        pushLog(`You stacked ${card.num}.`, "you");
        setTurn("ai");
        busy.current = false;
        return;
      }
      return; // illegal while a penalty is pending unless matching number
    }

    if (!isLegal(card, topNum, activeShape)) return;
    if (card.shape === "whot") {
      setCalling(card);
      return;
    }
    busy.current = true;
    finishPlay(card, "you");
  };

  const callShape = (shape: Shape) => {
    if (!calling) return;
    busy.current = true;
    const card = calling;
    setCalling(null);
    finishPlay(card, "you", shape);
  };

  const goMarket = () => {
    if (turn !== "you" || winner || busy.current || calling) return;
    busy.current = true;
    if (pending) {
      const [taken, m] = drawFrom(market, pending.amount);
      setMarket(m);
      setYou((h) => [...h, ...taken]);
      pushLog(`You drew ${pending.amount} from the penalty.`, "you");
      setPending(null);
      setTurn("ai");
      busy.current = false;
      return;
    }
    const [taken, m] = drawFrom(market, 1);
    setMarket(m);
    setYou((h) => [...h, ...taken]);
    pushLog("You went to market.", "you");
    setTurn("ai");
    busy.current = false;
  };

  // ---- AI turn ----
  useEffect(() => {
    if (turn !== "ai" || winner) return;
    const t = setTimeout(() => {
      busy.current = true;

      if (pending) {
        const match = ai.find((c) => c.num === pending.num);
        if (match) {
          setPile((p) => [...p, match]);
          setActiveShape(match.shape);
          setAi((h) => h.filter((c) => c.id !== match.id));
          setPending({ type: "pick", amount: pending.amount + (pending.num === 2 ? 2 : 3), num: pending.num });
          pushLog(`AI stacked ${match.num}.`, "ai");
          setTurn("you");
          busy.current = false;
          return;
        }
        const [taken, m] = drawFrom(market, pending.amount);
        setMarket(m);
        setAi((h) => [...h, ...taken]);
        pushLog(`AI drew ${pending.amount} from the penalty.`, "ai");
        setPending(null);
        setTurn("you");
        busy.current = false;
        return;
      }

      // pick a legal card; prefer specials, then highest, keep whot for when stuck
      const legal = ai.filter((c) => isLegal(c, topNum, activeShape));
      const nonWhot = legal.filter((c) => c.shape !== "whot");
      let choice: Card | undefined;
      if (nonWhot.length) {
        const special = nonWhot.find((c) => [1, 2, 5, 8, 14].includes(c.num));
        choice = special ?? nonWhot.sort((a, b) => b.num - a.num)[0];
      } else {
        choice = legal[0]; // a whot
      }

      if (!choice) {
        const [taken, m] = drawFrom(market, 1);
        setMarket(m);
        setAi((h) => [...h, ...taken]);
        pushLog("AI went to market.", "ai");
        setTurn("you");
        busy.current = false;
        return;
      }

      if (choice.shape === "whot") {
        // call the AI's most common shape
        const counts: Record<string, number> = {};
        ai.forEach((c) => {
          if (c.shape !== "whot") counts[c.shape] = (counts[c.shape] ?? 0) + 1;
        });
        const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "circle") as Shape;
        finishPlay(choice, "ai", best);
      } else {
        finishPlay(choice, "ai");
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner, pending, ai, topNum, activeShape]);

  const youLegal = useMemo(() => {
    if (turn !== "you") return new Set<string>();
    const s = new Set<string>();
    you.forEach((c) => {
      if (pending ? c.num === pending.num : isLegal(c, topNum, activeShape)) s.add(c.id);
    });
    return s;
  }, [you, turn, pending, topNum, activeShape]);

  const fan = (i: number, n: number) => {
    const spread = Math.min(8, 44 / Math.max(1, n));
    const mid = (n - 1) / 2;
    return { rot: (i - mid) * spread, y: Math.abs(i - mid) * 5 };
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="rounded-full glass px-3 py-1.5 text-xs font-semibold text-ink-dim">Naija Whot</span>
      </div>

      {/* opponent */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-deep to-[#0b5e46] text-sm font-bold text-white">
          G
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">Gambit AI</p>
          <p className="text-[10px] text-ink-faint">{ai.length} cards</p>
        </div>
        {turn === "ai" && !winner && (
          <motion.span layoutId="whotTurn" className="h-2.5 w-2.5 rounded-full bg-teal" />
        )}
      </div>

      {/* opponent hand backs */}
      <div className="mt-3 flex justify-center">
        <div className="flex -space-x-5">
          {ai.map((c, i) => (
            <div key={c.id} className="h-16 w-11" style={{ transform: `rotate(${(i - (ai.length - 1) / 2) * 4}deg)` }}>
              <WhotCardBack />
            </div>
          ))}
        </div>
      </div>

      {/* table: market + pile */}
      <div className="mt-5 flex flex-1 items-center justify-center gap-6">
        <button
          onClick={goMarket}
          disabled={turn !== "you" || !!winner || !!calling}
          className="flex flex-col items-center gap-1.5 disabled:opacity-50"
        >
          <div className="relative h-24 w-16">
            <div className="absolute inset-0 translate-x-1 translate-y-1">
              <WhotCardBack />
            </div>
            <div className="absolute inset-0">
              <WhotCardBack />
            </div>
          </div>
          <span className="text-[10px] font-semibold text-ink-dim">Market · {market.length}</span>
        </button>

        <div className="flex flex-col items-center gap-1.5">
          <div className="relative h-24 w-16">
            <AnimatePresence mode="popLayout">
              {top && (
                <motion.div
                  key={top.id}
                  initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="absolute inset-0"
                >
                  <WhotCardFace shape={top.shape} num={top.num} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-dim">
            Call:
            <WhotShape shape={activeShape} size={12} />
            {SHAPE_LABEL[activeShape]}
          </span>
        </div>
      </div>

      {/* pending / status */}
      <div className="mb-2 text-center">
        {winner ? (
          <span className="text-sm font-bold text-ink-dim">Round over</span>
        ) : pending ? (
          <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-bold text-rose">
            Pick {pending.amount} or stack a {pending.num}
          </span>
        ) : (
          <span className="text-sm text-ink-dim">{turn === "you" ? "Your move" : "AI is thinking"}</span>
        )}
      </div>

      {/* your hand */}
      <div className="relative flex h-32 items-end justify-center">
        {you.map((c, i) => {
          const { rot, y } = fan(i, you.length);
          const legal = youLegal.has(c.id);
          return (
            <motion.button
              key={c.id}
              onClick={() => playCard(c)}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y, opacity: 1, rotate: rot }}
              whileHover={legal ? { y: y - 18, scale: 1.05 } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                transformOrigin: "bottom center",
                marginLeft: i === 0 ? 0 : -22,
                zIndex: legal ? 20 + i : i,
              }}
              className={cn(
                "h-28 w-[68px] shrink-0",
                turn === "you" && !legal && !pending && "opacity-55",
                pending && !legal && "opacity-40"
              )}
            >
              <div className={cn("h-full w-full rounded-xl", legal && "ring-2 ring-teal/80")}>
                <WhotCardFace shape={c.shape} num={c.num} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* event log */}
      <div className="mt-3 h-10 overflow-hidden text-center">
        <AnimatePresence mode="popLayout">
          {log[0] && (
            <motion.p
              key={log[0].text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "text-xs",
                log[0].tone === "you" && "text-violet-bright",
                log[0].tone === "ai" && "text-teal",
                log[0].tone === "sys" && "text-ink-faint"
              )}
            >
              {log[0].text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* call shape picker */}
      <AnimatePresence>
        {calling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-void/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              className="w-[86%] max-w-xs rounded-3xl glass p-5 text-center shadow-card"
            >
              <p className="mb-4 text-sm font-bold text-ink">Call a shape</p>
              <div className="grid grid-cols-2 gap-3">
                {(["circle", "triangle", "cross", "square", "star"] as Shape[]).map((sh) => (
                  <button
                    key={sh}
                    onClick={() => callShape(sh)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 ring-1 ring-white/10 transition-colors hover:bg-white/10"
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
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-center bg-void/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              className="w-[80%] max-w-xs rounded-3xl glass p-6 text-center shadow-card"
            >
              <p className={cn("font-display text-2xl font-bold", winner === "you" ? "text-teal" : "text-rose")}>
                {winner === "you" ? "You win" : "AI wins"}
              </p>
              {scores && (
                <p className="mt-1 text-sm text-ink-dim">
                  You {scores.you} · AI {scores.ai} (lower is better)
                </p>
              )}
              <button
                onClick={deal}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3 text-sm font-bold text-white shadow-glow"
              >
                <RotateCcw className="h-4 w-4" /> Play again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
