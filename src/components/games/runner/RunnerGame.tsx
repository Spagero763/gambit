"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw, Play } from "lucide-react";
import Link from "next/link";

type Action = "left" | "right" | "jump" | "slide";
type ObKind = "hurdle" | "gate" | "wall"; // jump / slide / dodge

interface Entity {
  type: "ob" | "coin";
  lane: number;
  y: number; // world y (px from top of play area)
  kind?: ObKind;
  taken?: boolean;
}

const W = 360;
const H = 600;
const LANES = [W * 0.25, W * 0.5, W * 0.75];
const GROUND = H - 96;
const PLAYER_R = 17;

export function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [finalScore, setFinalScore] = useState(0);
  const [finalCoins, setFinalCoins] = useState(0);

  // mutable game state
  const g = useRef({
    lane: 1,
    x: LANES[1],
    y: 0, // height above ground (jump)
    vy: 0,
    rolling: 0, // remaining roll time
    speed: 0.32,
    dist: 0,
    score: 0,
    coins: 0,
    ents: [] as Entity[],
    nextSpawn: 0,
    seed: 1,
    raf: 0,
    last: 0,
    dead: false,
    shake: 0,
  });

  const rand = () => {
    // deterministic LCG so SSR/no Math.random concerns; varied per session via seed
    const s = g.current;
    s.seed = (s.seed * 1103515245 + 12345) & 0x7fffffff;
    return s.seed / 0x7fffffff;
  };

  const reset = useCallback((seed: number) => {
    g.current = {
      ...g.current,
      lane: 1,
      x: LANES[1],
      y: 0,
      vy: 0,
      rolling: 0,
      speed: 0.32,
      dist: 0,
      score: 0,
      coins: 0,
      ents: [],
      nextSpawn: 0,
      seed: seed || 1,
      dead: false,
      shake: 0,
      last: 0,
    };
  }, []);

  const act = useCallback((a: Action) => {
    const s = g.current;
    if (s.dead) return;
    if (a === "left") s.lane = Math.max(0, s.lane - 1);
    if (a === "right") s.lane = Math.min(2, s.lane + 1);
    if (a === "jump" && s.y <= 0.1 && s.rolling <= 0) s.vy = 0.62;
    if (a === "slide" && s.rolling <= 0 && s.y <= 0.1) s.rolling = 420;
  }, []);

  // main loop
  useEffect(() => {
    if (phase !== "running") return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const s = g.current;
    s.last = performance.now();

    const spawn = () => {
      const r = rand();
      if (r < 0.62) {
        // obstacle row: pick 1-2 blocked lanes, always leave one open
        const kinds: ObKind[] = ["hurdle", "gate", "wall"];
        const open = Math.floor(rand() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === open) continue;
          if (rand() < 0.62) {
            s.ents.push({ type: "ob", lane: l, y: -40, kind: kinds[Math.floor(rand() * 3)] });
          }
        }
        // a coin on the open lane sometimes
        if (rand() < 0.6) s.ents.push({ type: "coin", lane: open, y: -40 });
      } else {
        // coin line
        const lane = Math.floor(rand() * 3);
        for (let i = 0; i < 3; i++) s.ents.push({ type: "coin", lane, y: -40 - i * 34 });
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(40, t - s.last);
      s.last = t;

      // physics
      s.speed = 0.32 + s.dist * 0.000018;
      s.dist += s.speed * dt;
      s.score = Math.floor(s.dist / 10) + s.coins * 5;
      s.x += (LANES[s.lane] - s.x) * 0.25;
      if (s.vy > 0 || s.y > 0) {
        s.y += s.vy * dt;
        s.vy -= 0.0026 * dt;
        if (s.y <= 0) {
          s.y = 0;
          s.vy = 0;
        }
      }
      if (s.rolling > 0) s.rolling -= dt;

      // spawns
      s.nextSpawn -= s.speed * dt;
      if (s.nextSpawn <= 0) {
        spawn();
        s.nextSpawn = 150 + rand() * 90;
      }

      // move + collide
      const py = GROUND - s.y;
      for (const e of s.ents) {
        e.y += s.speed * dt;
        if (e.taken) continue;
        const near = Math.abs(e.y - GROUND) < 26;
        if (near && e.lane === s.lane) {
          if (e.type === "coin") {
            e.taken = true;
            s.coins += 1;
          } else {
            const ok =
              (e.kind === "hurdle" && s.y > 26) ||
              (e.kind === "gate" && s.rolling > 0) ||
              false; // 'wall' can only be dodged by lane change
            if (!ok) {
              s.dead = true;
              s.shake = 14;
            }
          }
        }
      }
      s.ents = s.ents.filter((e) => e.y < H + 50 && !(e.taken && e.type === "coin" && e.y > GROUND));

      // ---- render ----
      ctx.clearRect(0, 0, W, H);
      const sh = s.shake > 0 ? (rand() - 0.5) * s.shake : 0;
      if (s.shake > 0) s.shake -= 1;
      ctx.save();
      ctx.translate(sh, 0);

      // track
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0b0b16");
      grad.addColorStop(1, "#13132a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // lane dividers (moving dashes)
      ctx.strokeStyle = "rgba(139,125,255,0.18)";
      ctx.lineWidth = 2;
      const off = (s.dist * 0.5) % 40;
      for (const lx of [W * 0.375, W * 0.625]) {
        for (let yy = -40 + off; yy < H; yy += 40) {
          ctx.beginPath();
          ctx.moveTo(lx, yy);
          ctx.lineTo(lx, yy + 20);
          ctx.stroke();
        }
      }
      // side rails
      ctx.fillStyle = "rgba(39,225,166,0.12)";
      ctx.fillRect(W * 0.13, 0, 3, H);
      ctx.fillRect(W * 0.87 - 3, 0, 3, H);

      // entities
      for (const e of s.ents) {
        const ex = LANES[e.lane];
        if (e.type === "coin") {
          if (e.taken) continue;
          ctx.beginPath();
          ctx.fillStyle = "#ffc15e";
          ctx.shadowColor = "#ffc15e";
          ctx.shadowBlur = 12;
          const r = 8 + Math.sin(s.dist * 0.05 + e.y) * 1.5;
          ctx.arc(ex, e.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          const colors: Record<ObKind, string> = {
            hurdle: "#8b7dff",
            gate: "#27e1a6",
            wall: "#ff6b9a",
          };
          ctx.fillStyle = colors[e.kind!];
          ctx.shadowColor = colors[e.kind!];
          ctx.shadowBlur = 14;
          if (e.kind === "hurdle") roundRect(ctx, ex - 26, e.y - 8, 52, 16, 6);
          else if (e.kind === "gate") roundRect(ctx, ex - 26, e.y - 34, 52, 14, 6);
          else roundRect(ctx, ex - 26, e.y - 30, 52, 44, 8);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // player
      const rolling = s.rolling > 0;
      ctx.save();
      ctx.translate(s.x, py);
      ctx.shadowColor = "#a89bff";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#e9e6ff";
      const h = rolling ? PLAYER_R * 1.1 : PLAYER_R * 2;
      const w2 = rolling ? PLAYER_R * 2.2 : PLAYER_R * 1.7;
      roundRect(ctx, -w2 / 2, -h, w2, h, 9);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      if (scoreRef.current) scoreRef.current.textContent = String(s.score);
      if (coinRef.current) coinRef.current.textContent = String(s.coins);

      if (s.dead) {
        setFinalScore(s.score);
        setFinalCoins(s.coins);
        setPhase("over");
        return;
      }
      s.raf = requestAnimationFrame(loop);
    };

    s.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.raf);
  }, [phase]);

  // keyboard + swipe input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "a"].includes(k)) act("left");
      else if (["arrowright", "d"].includes(k)) act("right");
      else if (["arrowup", "w", " "].includes(k)) act("jump");
      else if (["arrowdown", "s"].includes(k)) act("slide");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const touch = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? "right" : "left");
    else act(dy > 0 ? "slide" : "jump");
  };

  const start = () => {
    reset((Date.now() % 100000) + 7);
    setPhase("running");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm text-ink-dim">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full glass px-3 py-1.5 text-xs">
            <span className="text-ink-faint">Score </span>
            <span ref={scoreRef} className="font-mono font-bold text-ink">0</span>
          </span>
          <span className="rounded-full glass px-3 py-1.5 text-xs">
            <span className="text-amber">◉ </span>
            <span ref={coinRef} className="font-mono font-bold text-ink">0</span>
          </span>
        </div>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[360px]">
        <div
          className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-card"
          style={{ touchAction: "none" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", aspectRatio: `${W} / ${H}`, display: "block" }}
          />

          <AnimatePresence>
            {phase !== "running" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center bg-void/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  className="w-[78%] rounded-3xl glass p-6 text-center shadow-card"
                >
                  {phase === "ready" ? (
                    <>
                      <p className="font-display text-xl font-bold">Dash Runner</p>
                      <p className="mt-1 text-xs text-ink-dim">
                        Swipe or use arrows. Jump the violet bars, slide the teal
                        gates, dodge the pink walls.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-2xl font-bold text-violet-bright">
                        Run over
                      </p>
                      <p className="mt-1 text-sm text-ink-dim">
                        Score {finalScore} · {finalCoins} coins
                      </p>
                    </>
                  )}
                  <button
                    onClick={start}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3 text-sm font-bold text-white shadow-glow"
                  >
                    {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                    {phase === "ready" ? "Start running" : "Run again"}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* on-screen controls */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { a: "left" as Action, icon: ChevronLeft },
            { a: "jump" as Action, icon: ChevronUp },
            { a: "slide" as Action, icon: ChevronDown },
            { a: "right" as Action, icon: ChevronRight },
          ].map(({ a, icon: Icon }) => (
            <button
              key={a}
              onPointerDown={() => act(a)}
              className="flex items-center justify-center rounded-2xl glass py-3 text-ink active:bg-white/15"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
