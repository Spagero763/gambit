"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw, Play } from "lucide-react";
import Link from "next/link";

type Action = "left" | "right" | "jump" | "slide";
type ObKind = "train" | "barrier" | "gate"; // dodge / jump / slide

interface Entity {
  type: "ob" | "coin";
  lane: number;
  z: number;
  kind?: ObKind;
  done?: boolean;
}

const W = 360;
const H = 600;
const CX = W / 2;
const HORIZON = H * 0.3;
const GROUND = H * 0.94;
const SPREAD = W * 0.34; // near half-distance to a side lane
const HITZ = 0.05;

// perspective factor: 1 near, ~0.2 far
function persp(z: number) {
  return 1 / (1 + z * 3.2);
}
function project(sign: number, z: number, jump = 0) {
  const p = persp(z);
  const x = CX + sign * SPREAD * p;
  const yGround = HORIZON + (GROUND - HORIZON) * p;
  return { x, y: yGround - jump * p, p };
}

export function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"ready" | "running" | "over">("ready");
  const [finalScore, setFinalScore] = useState(0);
  const [finalCoins, setFinalCoins] = useState(0);

  const g = useRef({
    laneF: 1,
    lane: 1,
    jump: 0,
    vy: 0,
    roll: 0,
    speed: 0.00055,
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
    const s = g.current;
    s.seed = (s.seed * 1103515245 + 12345) & 0x7fffffff;
    return s.seed / 0x7fffffff;
  };

  const reset = useCallback((seed: number) => {
    g.current = {
      ...g.current,
      laneF: 1,
      lane: 1,
      jump: 0,
      vy: 0,
      roll: 0,
      speed: 0.00055,
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
    if (a === "jump" && s.jump <= 0.1 && s.roll <= 0) s.vy = 1.05;
    if (a === "slide" && s.roll <= 0 && s.jump <= 0.1) s.roll = 430;
  }, []);

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
      if (r < 0.66) {
        const kinds: ObKind[] = ["train", "barrier", "gate"];
        const open = Math.floor(rand() * 3);
        for (let l = 0; l < 3; l++) {
          if (l === open) continue;
          if (rand() < 0.6) s.ents.push({ type: "ob", lane: l, z: 1, kind: kinds[Math.floor(rand() * 3)] });
        }
        if (rand() < 0.6) s.ents.push({ type: "coin", lane: open, z: 1 });
      } else {
        const lane = Math.floor(rand() * 3);
        for (let i = 0; i < 3; i++) s.ents.push({ type: "coin", lane, z: 1 + i * 0.06 });
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(40, t - s.last);
      s.last = t;

      s.speed = 0.00055 + s.dist * 0.00000004;
      s.dist += s.speed * dt * 1000;
      s.score = Math.floor(s.dist / 6) + s.coins * 5;
      s.laneF += (s.lane - s.laneF) * 0.25;
      if (s.vy > 0 || s.jump > 0) {
        s.jump += s.vy * dt;
        s.vy -= 0.0042 * dt;
        if (s.jump <= 0) {
          s.jump = 0;
          s.vy = 0;
        }
      }
      if (s.roll > 0) s.roll -= dt;

      s.nextSpawn -= s.speed * dt * 1000;
      if (s.nextSpawn <= 0) {
        spawn();
        s.nextSpawn = 0.42 + rand() * 0.28;
      }

      // advance + collide
      for (const e of s.ents) {
        e.z -= s.speed * dt;
        if (e.done) continue;
        if (e.z < HITZ && e.z > -0.1 && e.lane === s.lane) {
          if (e.type === "coin") {
            e.done = true;
            s.coins += 1;
          } else {
            const ok =
              (e.kind === "barrier" && s.jump > 22) ||
              (e.kind === "gate" && s.roll > 0) ||
              false; // train: only dodge by lane
            if (!ok) {
              s.dead = true;
              s.shake = 16;
            } else {
              e.done = true;
            }
          }
        }
      }
      s.ents = s.ents.filter((e) => e.z > -0.12);

      // ---------- render ----------
      ctx.clearRect(0, 0, W, H);
      const sh = s.shake > 0 ? (rand() - 0.5) * s.shake : 0;
      if (s.shake > 0) s.shake -= 1;
      ctx.save();
      ctx.translate(sh, 0);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#1a1840");
      sky.addColorStop(0.55, "#0e0d24");
      sky.addColorStop(1, "#0a0a1c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // distant glow
      const sun = ctx.createRadialGradient(CX, HORIZON, 10, CX, HORIZON, 150);
      sun.addColorStop(0, "rgba(168,155,255,0.4)");
      sun.addColorStop(1, "rgba(168,155,255,0)");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, HORIZON + 120);

      // ground trapezoid
      const nL = project(-1.6, 0), nR = project(1.6, 0), fL = project(-1.6, 1), fR = project(1.6, 1);
      const gg = ctx.createLinearGradient(0, HORIZON, 0, GROUND);
      gg.addColorStop(0, "#171436");
      gg.addColorStop(1, "#241f52");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(fL.x, fL.y);
      ctx.lineTo(fR.x, fR.y);
      ctx.lineTo(nR.x, nR.y);
      ctx.lineTo(nL.x, nL.y);
      ctx.closePath();
      ctx.fill();

      // sleepers (sense of speed)
      const phase2 = (s.dist * 0.02) % 0.14;
      ctx.strokeStyle = "rgba(139,125,255,0.16)";
      for (let i = 0; i < 9; i++) {
        const z = 0.02 + i * 0.14 + phase2;
        if (z <= 0 || z > 1) continue;
        const a = project(-1.6, z), b = project(1.6, z);
        ctx.lineWidth = Math.max(1, 6 * a.p);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // lane dividers + rails
      for (const [sign, col, wdt] of [
        [-0.5, "rgba(255,255,255,0.18)", 2],
        [0.5, "rgba(255,255,255,0.18)", 2],
        [-1.5, "rgba(39,225,166,0.5)", 3],
        [1.5, "rgba(39,225,166,0.5)", 3],
      ] as const) {
        const a = project(sign, 0), b = project(sign, 1);
        ctx.strokeStyle = col;
        ctx.lineWidth = wdt;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // entities, far first
      const sorted = [...s.ents].sort((a, b) => b.z - a.z);
      for (const e of sorted) {
        if (e.done) continue;
        const sign = e.lane - 1;
        const pr = project(sign, e.z);
        if (e.type === "coin") {
          const r = 13 * pr.p;
          ctx.save();
          ctx.translate(pr.x, pr.y - 26 * pr.p);
          const spin = Math.abs(Math.cos(s.dist * 0.04 + e.z * 6));
          ctx.scale(0.35 + spin * 0.65, 1);
          ctx.fillStyle = "#ffc15e";
          ctx.shadowColor = "#ffc15e";
          ctx.shadowBlur = 14 * pr.p;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.shadowBlur = 0;
        } else {
          drawObstacle(ctx, e.kind!, pr.x, pr.y, pr.p);
        }
      }

      // player
      drawRunner(ctx, project(s.laneF - 1, 0.012, s.jump), s.roll > 0, s.dist);

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
            <span className="text-amber">●</span>{" "}
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
          <canvas ref={canvasRef} style={{ width: "100%", aspectRatio: `${W} / ${H}`, display: "block" }} />

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
                        Swipe or arrows. Dodge trains, jump barriers, slide under
                        gates, grab coins.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-2xl font-bold text-violet-bright">Run over</p>
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

function drawObstacle(ctx: CanvasRenderingContext2D, kind: ObKind, x: number, yBase: number, p: number) {
  const w = SPREAD * 0.9 * p;
  const depth = 26 * p;
  if (kind === "train") {
    const h = 150 * p;
    box(ctx, x, yBase, w, h, depth, "#ff6b9a", "#cf4f78", "#8f3556");
    ctx.fillStyle = "rgba(10,8,20,0.7)";
    ctx.fillRect(x - w * 0.28, yBase - h * 0.78, w * 0.56, h * 0.3);
  } else if (kind === "barrier") {
    const h = 34 * p;
    box(ctx, x, yBase, w, h, depth, "#8b7dff", "#5b4ee0", "#3a3196");
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(1, 3 * p);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.3 - 6 * p, yBase - 4 * p);
      ctx.lineTo(x + i * w * 0.3 + 6 * p, yBase - h + 4 * p);
      ctx.stroke();
    }
  } else {
    // gate: bar held up high, slide under
    const top = yBase - 130 * p;
    const h = 26 * p;
    box(ctx, x, top + h, w, h, depth, "#27e1a6", "#10b886", "#0c7c5e");
    ctx.strokeStyle = "rgba(39,225,166,0.4)";
    ctx.lineWidth = Math.max(1, 3 * p);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, top + h);
    ctx.lineTo(x - w / 2, yBase);
    ctx.moveTo(x + w / 2, top + h);
    ctx.lineTo(x + w / 2, yBase);
    ctx.stroke();
  }
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  w: number,
  h: number,
  depth: number,
  front: string,
  side: string,
  top: string
) {
  const l = x - w / 2;
  const r = x + w / 2;
  const tY = yBase - h;
  // front
  ctx.fillStyle = front;
  ctx.fillRect(l, tY, w, h);
  // top
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(l, tY);
  ctx.lineTo(l + depth, tY - depth);
  ctx.lineTo(r + depth, tY - depth);
  ctx.lineTo(r, tY);
  ctx.closePath();
  ctx.fill();
  // side
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(r, tY);
  ctx.lineTo(r + depth, tY - depth);
  ctx.lineTo(r + depth, yBase - depth);
  ctx.lineTo(r, yBase);
  ctx.closePath();
  ctx.fill();
}

function drawRunner(
  ctx: CanvasRenderingContext2D,
  pr: { x: number; y: number; p: number },
  rolling: boolean,
  dist: number
) {
  const { x, y, p } = pr;
  const sc = p * 1.1;
  ctx.save();
  ctx.translate(x, y);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 26 * sc, 8 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#a89bff";
  ctx.shadowBlur = 16 * sc;

  if (rolling) {
    ctx.fillStyle = "#cfc7ff";
    ctx.beginPath();
    ctx.ellipse(0, -16 * sc, 24 * sc, 16 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const swing = Math.sin(dist * 0.05) * 8 * sc;
  // legs
  ctx.strokeStyle = "#8b7dff";
  ctx.lineWidth = 7 * sc;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -34 * sc);
  ctx.lineTo(-8 * sc, -2 * sc + swing);
  ctx.moveTo(0, -34 * sc);
  ctx.lineTo(8 * sc, -2 * sc - swing);
  ctx.stroke();
  // body
  ctx.strokeStyle = "#cfc7ff";
  ctx.lineWidth = 12 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -34 * sc);
  ctx.lineTo(0, -62 * sc);
  ctx.stroke();
  // arms
  ctx.strokeStyle = "#8b7dff";
  ctx.lineWidth = 6 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -56 * sc);
  ctx.lineTo(-10 * sc, -44 * sc - swing);
  ctx.moveTo(0, -56 * sc);
  ctx.lineTo(10 * sc, -44 * sc + swing);
  ctx.stroke();
  // head
  ctx.fillStyle = "#e9e6ff";
  ctx.beginPath();
  ctx.arc(0, -72 * sc, 10 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
