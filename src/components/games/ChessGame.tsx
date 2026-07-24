"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, PieceSymbol, Square } from "chess.js";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { chooseMoveByLevel } from "@/lib/games/chess-ai";
import { capturedOf, materialEdge } from "@/lib/games/chess-material";
import { Difficulty } from "@/lib/difficulty";
import { play } from "@/lib/sfx";
import { randomBot } from "@/lib/bots";
import { recordResult } from "@/lib/progress";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { Avatar, BotFace } from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { ResultOverlay, ResultKind } from "./ResultOverlay";
import { ChessPiece } from "./chess/ChessPiece";
import { PlayerBar } from "./chess/PlayerBar";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const START_TIME = 300;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.max(0, s % 60).toString().padStart(2, "0")}`;
}

interface Drag {
  from: Square;
  type: PieceSymbol;
  lx: number;
  ly: number;
  sx: number;
  sy: number;
  cell: number;
  moved: boolean;
}

export function ChessGame({ difficulty = "normal" }: { difficulty?: Difficulty }) {
  const gameRef = useRef(new Chess());
  const boardRef = useRef<HTMLDivElement>(null);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [result, setResult] = useState<ResultKind>(null);
  const [wTime, setWTime] = useState(START_TIME);
  const [bTime, setBTime] = useState(START_TIME);

  const game = gameRef.current;
  const turn = game.turn();
  const bot = useMemo(() => randomBot(), []);
  const [settings] = useSettings();
  const youName = settings.name || "You";

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setDrag(null);
    setLast(null);
    setPromo(null);
    setResult(null);
    setWTime(START_TIME);
    setBTime(START_TIME);
  }, []);

  const settle = useCallback(() => {
    const g = gameRef.current;
    if (!g.isGameOver()) return;
    if (g.isCheckmate()) {
      const youLost = g.turn() === "w";
      setResult(youLost ? "lose" : "win");
      play(youLost ? "lose" : "win");
      recordResult("chess", youLost ? "lose" : "win");
    } else {
      setResult("draw");
      recordResult("chess", "draw");
    }
  }, []);

  const targets = useMemo(() => {
    if (!selected) return new Map<Square, Move>();
    const m = new Map<Square, Move>();
    for (const mv of game.moves({ square: selected, verbose: true }) as Move[]) {
      if (!m.has(mv.to as Square) || mv.promotion === "q") m.set(mv.to as Square, mv);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fen]);

  const commit = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const m = game.move({ from, to, promotion });
      setLast({ from, to });
      setSelected(null);
      setFen(game.fen());
      // spatial: the sound comes from where the piece landed on the board
      const pan = ((to.charCodeAt(0) - 97) / 7) * 1.6 - 0.8;
      if (m?.captured) play("capture", { pan });
      else play("place", { pan });
      if (game.inCheck() && !game.isGameOver()) play("check", { pan });
      settle();
    },
    [game, settle]
  );

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const mv = (game.moves({ square: from, verbose: true }) as Move[]).find((m) => m.to === to);
      if (!mv) return;
      if (mv.promotion) setPromo({ from, to });
      else commit(from, to);
    },
    [game, commit]
  );

  const squareAt = (clientX: number, clientY: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
    const file = Math.min(7, Math.max(0, Math.floor(fx * 8)));
    const row = Math.min(7, Math.max(0, Math.floor(fy * 8)));
    return (FILES[file] + (8 - row)) as Square;
  };

  const onDown = (e: React.PointerEvent) => {
    if (result || turn !== "w" || promo) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    const piece = game.get(sq);

    if (selected && targets.has(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (piece && piece.color === "w") {
      const rect = boardRef.current!.getBoundingClientRect();
      boardRef.current!.setPointerCapture(e.pointerId);
      setSelected(sq);
      setDrag({
        from: sq,
        type: piece.type,
        lx: e.clientX - rect.left,
        ly: e.clientY - rect.top,
        sx: e.clientX,
        sy: e.clientY,
        cell: rect.width / 8,
        moved: false,
      });
    } else {
      setSelected(null);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const rect = boardRef.current!.getBoundingClientRect();
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5;
    setDrag({ ...drag, lx: e.clientX - rect.left, ly: e.clientY - rect.top, moved });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const target = squareAt(e.clientX, e.clientY);
    if (drag.moved && target && target !== drag.from && targets.has(target)) {
      tryMove(drag.from, target);
    }
    setDrag(null);
  };

  useEffect(() => {
    if (turn !== "b" || result || promo) return;
    // a human-feeling think: 0.8 to 2.4 seconds of REAL time, during which the
    // normal per-second tick runs the bot's clock down. No artificial jumps —
    // both clocks now burn actual elapsed time, like a real game.
    const think = 800 + Math.random() * 1600;
    const t = setTimeout(() => {
      const mv = chooseMoveByLevel(game.fen(), difficulty);
      if (mv) {
        const m = game.move(mv);
        setLast({ from: mv.from as Square, to: mv.to as Square });
        setFen(game.fen());
        const pan = ((mv.to.charCodeAt(0) - 97) / 7) * 1.6 - 0.8;
        if (m?.captured) play("capture", { pan });
        else play("place", { pan });
        if (game.inCheck() && !game.isGameOver()) play("check", { pan });
        settle();
      }
    }, think);
    return () => clearTimeout(t);
  }, [turn, fen, result, promo, settle, game, difficulty]);

  // tick the side-to-move's clock. Keep the updater pure — flagging is handled
  // in its own effect below (calling setResult inside an updater is a bug).
  useEffect(() => {
    if (result || promo) return;
    const id = setInterval(() => {
      if (turn === "w") setWTime((t) => Math.max(0, t - 1));
      else setBTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [turn, result, promo]);

  // flag-fall: whoever hits 0 first loses (you = lose, bot = win)
  useEffect(() => {
    if (result) return;
    if (wTime <= 0) {
      setResult("lose");
      play("lose");
      recordResult("chess", "lose");
    } else if (bTime <= 0) {
      setResult("win");
      play("win");
      recordResult("chess", "win");
    }
  }, [wTime, bTime, result]);

  const board = game.board();
  const inCheck = game.inCheck();
  const edge = materialEdge(game); // +white
  // captured BY you (white) = black pieces gone; BY ai = white pieces gone
  const youCaptured = capturedOf(game, "b").list;
  const aiCaptured = capturedOf(game, "w").list;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-void-700 px-3 py-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold",
            inCheck && !result ? "border-rose/40 bg-rose/10 text-rose" : "border-line bg-void-700 text-ink-dim"
          )}
        >
          {inCheck && !result ? "Check" : "Free play"}
        </span>
      </div>

      {/* opponent (top) */}
      <div className="mt-4">
        <PlayerBar
          name={bot.name}
          pieceColor="b"
          active={turn === "b" && !result}
          clock={fmt(bTime)}
          lowTime={bTime <= 30}
          captured={aiCaptured}
          edge={Math.max(0, -edge)}
          avatar={<BotFace bot={bot} size={40} />}
        />
      </div>

      {/* board */}
      <div className="relative mt-3">
        <div
          className="rounded-[20px] p-2.5"
          style={{
            background: "linear-gradient(160deg, #2b2620, #1a1611)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -4px 10px rgba(0,0,0,0.5), 0 26px 60px -26px rgba(0,0,0,0.95)",
          }}
        >
          <div
            ref={boardRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            data-coach="board"
            className="relative grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-md ring-1 ring-black/40"
            style={{ touchAction: "none", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.45)" }}
          >
            {board.map((row, r) =>
              row.map((piece, f) => {
                const square = (FILES[f] + (8 - r)) as Square;
                const lightSq = (r + f) % 2 === 0;
                const isSel = selected === square;
                const isTarget = targets.has(square);
                const isLast = last && (last.from === square || last.to === square);
                const isCheckSq = inCheck && piece?.type === "k" && piece.color === turn;
                const lifted = drag?.moved && drag.from === square;

                return (
                  <div
                    key={square}
                    className={cn(
                      "relative flex items-center justify-center",
                      lightSq ? "bg-[#eeeed2]" : "bg-[#769656]"
                    )}
                  >
                    {isLast && <span className="absolute inset-0 bg-[#f6d66b]/45" />}
                    {isSel && <span className="absolute inset-0 bg-[#f6d66b]/55" />}
                    {isCheckSq && (
                      <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(224,108,139,0.95),transparent_72%)]" />
                    )}

                    {f === 0 && (
                      <span
                        className={cn(
                          "absolute left-0.5 top-0.5 text-[8px] font-bold",
                          lightSq ? "text-[#769656]" : "text-[#eeeed2]"
                        )}
                      >
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span
                        className={cn(
                          "absolute bottom-0 right-0.5 text-[8px] font-bold",
                          lightSq ? "text-[#769656]" : "text-[#eeeed2]"
                        )}
                      >
                        {FILES[f]}
                      </span>
                    )}

                    {piece && !lifted && (
                      <motion.div
                        initial={false}
                        className="relative z-10"
                      >
                        <ChessPiece type={piece.type} color={piece.color} size={42} className="select-none" />
                      </motion.div>
                    )}

                    {isTarget &&
                      (piece ? (
                        <span className="absolute inset-1 rounded-full ring-[3px] ring-black/30" />
                      ) : (
                        <span className="absolute h-[28%] w-[28%] rounded-full bg-black/25" />
                      ))}
                  </div>
                );
              })
            )}

            {drag?.moved && (
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: drag.lx,
                  top: drag.ly,
                  width: drag.cell,
                  height: drag.cell,
                  transform: "translate(-50%, -50%) scale(1.14)",
                }}
              >
                <ChessPiece type={drag.type} color="w" size={drag.cell} />
              </div>
            )}
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
              <motion.div
                initial={{ scale: 0.85, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                className="rounded-2xl glass p-4 text-center shadow-card"
              >
                <p className="mb-3 text-sm font-semibold text-ink">Promote to</p>
                <div className="flex gap-2">
                  {(["q", "r", "b", "n"] as PieceSymbol[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        commit(promo.from, promo.to, t);
                        setPromo(null);
                      }}
                      className="grid h-14 w-14 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                    >
                      <ChessPiece type={t} color="w" size={40} />
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ResultOverlay result={result} onRematch={reset} />
      </div>

      {/* status strip */}
      <p className="mt-3 text-center text-sm text-ink-dim">
        {result ? "Game over" : turn === "w" ? "Your move" : "Opponent is thinking"}
      </p>

      {/* you (bottom) */}
      <div className="mt-3">
        <PlayerBar
          name={youName}
          pieceColor="w"
          active={turn === "w" && !result}
          clock={fmt(wTime)}
          lowTime={wTime <= 30}
          captured={youCaptured}
          edge={Math.max(0, edge)}
          you
          avatar={
            <Avatar
              image={settings.avatarImage || undefined}
              color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.violet}
              name={youName}
              size={40}
              rounded="rounded-xl"
            />
          }
        />
      </div>
    </div>
  );
}
