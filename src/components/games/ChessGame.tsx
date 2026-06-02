"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, PieceSymbol, Square } from "chess.js";
import { AnimatePresence, motion } from "framer-motion";
import { chooseMove } from "@/lib/games/chess-ai";
import { cn } from "@/lib/cn";
import { MatchShell } from "./MatchShell";
import { ResultOverlay, ResultKind } from "./ResultOverlay";
import { ChessPiece } from "./chess/ChessPiece";

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

export function ChessGame() {
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
    if (g.isCheckmate()) setResult(g.turn() === "w" ? "lose" : "win");
    else setResult("draw");
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
      game.move({ from, to, promotion });
      setLast({ from, to });
      setSelected(null);
      setFen(game.fen());
      settle();
    },
    [game, settle]
  );

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const mv = (game.moves({ square: from, verbose: true }) as Move[]).find(
        (m) => m.to === to
      );
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

  // AI plays black
  useEffect(() => {
    if (turn !== "b" || result || promo) return;
    const t = setTimeout(() => {
      const mv = chooseMove(game.fen(), 2);
      if (mv) {
        game.move(mv);
        setLast({ from: mv.from as Square, to: mv.to as Square });
        setFen(game.fen());
        settle();
      }
    }, 480);
    return () => clearTimeout(t);
  }, [turn, fen, result, promo, settle, game]);

  // clocks
  useEffect(() => {
    if (result || promo) return;
    const id = setInterval(() => {
      if (turn === "w")
        setWTime((t) => (t <= 1 ? (setResult("lose"), 0) : t - 1));
      else setBTime((t) => (t <= 1 ? (setResult("win"), 0) : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [turn, result, promo]);

  const board = game.board();
  const inCheck = game.inCheck();

  return (
    <MatchShell
      title="Chess"
      status={
        result ? "Game over" : inCheck ? "Check" : turn === "w" ? "Your move" : "Opponent is thinking"
      }
      players={[
        {
          name: "You",
          mark: <ChessPiece type="k" color="w" size={20} />,
          active: turn === "w" && !result,
          accent: "text-violet-bright",
          clock: fmt(wTime),
        },
        {
          name: "Gambit AI",
          mark: <ChessPiece type="q" color="b" size={20} />,
          active: turn === "b" && !result,
          accent: "text-teal",
          clock: fmt(bTime),
        },
      ]}
    >
      <div className="relative w-full max-w-[360px]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-card">
          <div
            ref={boardRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="relative grid aspect-square grid-cols-8 overflow-hidden rounded-md"
            style={{ touchAction: "none" }}
          >
          {board.map((row, r) =>
            row.map((piece, f) => {
              const square = (FILES[f] + (8 - r)) as Square;
              const light = (r + f) % 2 === 0;
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
                    light ? "bg-[#ece7d7]" : "bg-[#6b6498]"
                  )}
                >
                  {isLast && <span className="absolute inset-0 bg-amber/35" />}
                  {isSel && <span className="absolute inset-0 bg-teal/40" />}
                  {isCheckSq && (
                    <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,107,154,0.85),transparent_70%)]" />
                  )}

                  {/* coordinates */}
                  {f === 0 && (
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 text-[8px] font-bold",
                        light ? "text-[#6b6498]" : "text-[#ece7d7]"
                      )}
                    >
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span
                      className={cn(
                        "absolute bottom-0 right-0.5 text-[8px] font-bold",
                        light ? "text-[#6b6498]" : "text-[#ece7d7]"
                      )}
                    >
                      {FILES[f]}
                    </span>
                  )}

                  {piece && !lifted && (
                    <ChessPiece type={piece.type} color={piece.color} size={42} className="relative z-10 select-none" />
                  )}

                  {isTarget &&
                    (piece ? (
                      <span className="absolute inset-1 rounded-full ring-[3px] ring-teal/80" />
                    ) : (
                      <span className="absolute h-1/4 w-1/4 rounded-full bg-teal/70" />
                    ))}
                </div>
              );
            })
          )}

          {/* floating dragged piece */}
          {drag?.moved && (
            <div
              className="pointer-events-none absolute z-30"
              style={{
                left: drag.lx,
                top: drag.ly,
                width: drag.cell,
                height: drag.cell,
                transform: "translate(-50%, -50%) scale(1.12)",
              }}
            >
              <ChessPiece type={drag.type} color="w" size={drag.cell} />
            </div>
          )}
          </div>
        </div>

        {/* promotion picker */}
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
    </MatchShell>
  );
}
