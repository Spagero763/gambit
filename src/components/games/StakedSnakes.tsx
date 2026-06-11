"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink, Dices } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { SNAKES_LADDERS, centerFrac } from "@/lib/games/snakesLayout";
import { SettleOverlay } from "./SettleOverlay";
import { TimeoutClaim } from "./TimeoutClaim";
import { MatchChat } from "./MatchChat";
import { useProfiles, displayName } from "@/lib/profiles";
import { cn } from "@/lib/cn";

interface SnakesState {
  pos: Record<string, number>;
  order: string[];
  turn: string;
  dice: number;
}

interface MatchRow {
  id: number;
  game: string;
  chain_id: number;
  creator: string;
  opponent: string | null;
  status: string;
  state: SnakesState;
  winner: string | null;
  settle_tx: string | null;
  settle_error: string | null;
  stake?: string;
  token?: string | null;
  decimals?: number;
  updated_at: string;
}

const EXPLORER: Record<number, string> = {
  42220: "https://celoscan.io/tx/",
  11142220: "https://sepolia.celoscan.io/tx/",
};

const MEEPLE_PATH =
  "M50 5C40 5 33 13 33 22C33 28 36 33 41 36C30 39 22 47 17 58C15 62 17 67 22 67L36 67C36 67 33 75 33 82C33 90 40 95 50 95C60 95 67 90 67 82C67 75 64 67 64 67L78 67C83 67 85 62 83 58C78 47 70 39 59 36C64 33 67 28 67 22C67 13 60 5 50 5Z";

export function StakedSnakes({ matchId, you }: { matchId: bigint; you: `0x${string}` }) {
  const me = you.toLowerCase();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const oppAddr = [match?.creator, match?.opponent].find((a) => a && a.toLowerCase() !== me) ?? null;
  const oppProfiles = useProfiles(oppAddr ? [oppAddr] : []);
  const oppName = oppAddr ? displayName(oppAddr, oppProfiles[oppAddr.toLowerCase()]) : "Opponent";
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

  const order = match?.state?.order ?? [];
  const opp = order.find((a) => a !== me);
  const myPos = match?.state?.pos?.[me] ?? 1;
  const oppPos = (opp && match?.state?.pos?.[opp]) || 1;
  const myTurn = match?.status === "active" && match?.state?.turn === me;
  const dice = match?.state?.dice ?? 1;
  const finished = match?.status === "settling" || match?.status === "settled";
  const iWon = match?.winner?.toLowerCase() === me;
  const draw = finished && !match?.winner;

  const roll = async () => {
    if (!myTurn || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await submitMove(matchId, me, { roll: true });
      if (res.state) setMatch((m) => (m ? { ...m, state: res.state as SnakesState } : m));
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Roll failed");
    } finally {
      setBusy(false);
    }
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
    ? "Your roll"
    : "Opponent's roll";

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

      <div className="mt-3 flex items-center justify-between gap-3">
        <Tag label="You" pos={myPos} color="violet" active={!!myTurn} />
        <span className="text-xs text-ink-faint">vs</span>
        <Tag label={oppName} pos={oppPos} color="amber" active={match?.status === "active" && !myTurn} alignRight />
      </div>

      <p className="mt-3 text-center text-sm text-ink-dim">{status}</p>

      <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />
      <MatchChat matchId={matchId} me={me} />

      <div className="relative mx-auto mt-3 w-full max-w-[360px]">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-3xl border border-line p-2 shadow-card"
          style={{ background: "#171206", boxShadow: "inset 0 2px 20px rgba(0,0,0,0.5), 0 20px 50px -20px rgba(0,0,0,0.8)" }}
        >
          <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-px">
            {Array.from({ length: 100 }).map((_, i) => {
              const rowFromTop = Math.floor(i / 10);
              const colInRow = i % 10;
              const rowFromBottom = 9 - rowFromTop;
              const leftToRight = rowFromBottom % 2 === 0;
              const base = rowFromBottom * 10;
              const n = leftToRight ? base + colInRow + 1 : base + (10 - colInRow);
              const isLadder = n in SNAKES_LADDERS.ladders;
              const isSnake = n in SNAKES_LADDERS.snakes;
              return (
                <div
                  key={i}
                  className="relative flex items-start justify-start rounded-[3px] text-[7px] leading-none"
                  style={{
                    background: isLadder
                      ? "rgba(70,192,138,0.16)"
                      : isSnake
                      ? "rgba(224,108,139,0.16)"
                      : (rowFromTop + colInRow) % 2 === 0
                      ? "#2a2418"
                      : "#332b1b",
                  }}
                >
                  <span className="m-[2px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {n}
                  </span>
                </div>
              );
            })}
          </div>

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-2" style={{ width: "calc(100% - 1rem)", height: "calc(100% - 1rem)" }}>
            {Object.entries(SNAKES_LADDERS.ladders).map(([f, t]) => (
              <Ladder key={`l${f}`} from={+f} to={+t} />
            ))}
            {Object.entries(SNAKES_LADDERS.snakes).map(([f, t]) => (
              <SnakePath key={`s${f}`} from={+f} to={+t} />
            ))}
          </svg>

          {/* tokens */}
          <div className="pointer-events-none absolute inset-2">
            <Token pos={oppPos} color="#e3b341" offset={2.5} z={10} />
            <Token pos={myPos} color="#8e8bf0" offset={-2.5} z={20} />
          </div>
        </div>

        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 grid place-items-center rounded-3xl bg-void/80 backdrop-blur-sm"
            >
              <SettleOverlay
                result={iWon ? "win" : "lose"}
                status={match?.status ?? "settling"}
                settleTx={match?.settle_tx}
                settleError={match?.settle_error}
                chainId={match?.chain_id}
                matchId={matchId}
                shareAddress={me}
                stakeWei={match?.stake}
                decimals={match?.decimals}
                token={match?.token}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <motion.div
          key={dice}
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          className="grid h-14 w-14 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl border border-line bg-void-700 p-2 shadow-card"
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
            return <span key={i} className={cn("m-auto h-2 w-2 rounded-full", pips[dice]?.includes(i) ? "bg-ink" : "bg-transparent")} />;
          })}
        </motion.div>
        <button
          onClick={roll}
          disabled={!myTurn || busy || finished}
          className={cn("btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm shadow-glow transition-opacity", (!myTurn || busy || finished) && "opacity-40")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />} Roll
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-faint">Roll exactly onto 100 to win. Overshoot and you hold.</p>

      {err && <p className="mt-2 text-center text-[11px] text-rose">{err}</p>}
    </div>
  );
}

function Token({ pos, color, offset, z }: { pos: number; color: string; offset: number; z: number }) {
  const c = centerFrac(pos);
  return (
    <motion.div
      className="absolute"
      style={{ zIndex: z }}
      animate={{ left: `${c.x * 100 + offset}%`, top: `${c.y * 100}%` }}
      transition={{ type: "tween", duration: 0.6, ease: "easeInOut" }}
    >
      <div className="h-[26px] w-[21px] -translate-x-1/2 -translate-y-[62%]">
        <svg viewBox="0 0 100 100" className="h-full w-full" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.55))" }}>
          <path d={MEEPLE_PATH} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={6} strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}

function Tag({ label, pos, color, active, alignRight }: { label: string; pos: number; color: "violet" | "amber"; active?: boolean; alignRight?: boolean }) {
  const hex = color === "violet" ? "#8e8bf0" : "#e3b341";
  return (
    <div className={cn("flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2.5 transition-all", active ? "border-line-strong bg-void-700" : "border-line bg-void-800", alignRight && "flex-row-reverse text-right")}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-void-600">
        <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40" style={{ background: hex }} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="nums text-[10px] text-ink-faint">square {pos}</p>
      </div>
    </div>
  );
}

function Ladder({ from, to }: { from: number; to: number }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100, y1 = a.y * 100, x2 = b.x * 100, y2 = b.y * 100;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1.6, py = (dx / len) * 1.6;
  const count = Math.max(4, Math.round(len / 9));
  const rungs = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
  return (
    <g strokeLinecap="round">
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} stroke="rgba(0,0,0,0.4)" strokeWidth={1.8} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} stroke="rgba(0,0,0,0.4)" strokeWidth={1.8} />
      <line x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} stroke="#46c08a" strokeWidth={1.1} />
      <line x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} stroke="#46c08a" strokeWidth={1.1} />
      {rungs.map((t, i) => (
        <line key={i} x1={x1 + dx * t + px} y1={y1 + dy * t + py} x2={x1 + dx * t - px} y2={y1 + dy * t - py} stroke="#46c08a" strokeWidth={0.9} />
      ))}
    </g>
  );
}

function SnakePath({ from, to }: { from: number; to: number }) {
  const a = centerFrac(from);
  const b = centerFrac(to);
  const x1 = a.x * 100, y1 = a.y * 100, x2 = b.x * 100, y2 = b.y * 100;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const amp = Math.min(11, len * 0.2);
  const c1x = x1 + dx * 0.33 + px * amp, c1y = y1 + dy * 0.33 + py * amp;
  const c2x = x1 + dx * 0.66 - px * amp, c2y = y1 + dy * 0.66 - py * amp;
  const body = `M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
  const ux = (c1x - x1) / (Math.hypot(c1x - x1, c1y - y1) || 1);
  const uy = (c1y - y1) / (Math.hypot(c1x - x1, c1y - y1) || 1);
  const tipx = x1 - ux * 4.5, tipy = y1 - uy * 4.5;
  return (
    <g strokeLinecap="round">
      <path d={body} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={5} />
      <path d={body} fill="none" stroke="#e06c8b" strokeWidth={3.4} />
      <path d={body} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={3} strokeDasharray="0.5 3.4" />
      <g stroke="#ff3b5c" strokeWidth={0.7}>
        <line x1={x1 - ux * 1.5} y1={y1 - uy * 1.5} x2={tipx} y2={tipy} />
        <line x1={tipx} y1={tipy} x2={tipx - uy * 1.3} y2={tipy + ux * 1.3} />
        <line x1={tipx} y1={tipy} x2={tipx + uy * 1.3} y2={tipy - ux * 1.3} />
      </g>
      <ellipse cx={x1} cy={y1} rx={3.4} ry={2.7} fill="#e06c8b" stroke="rgba(0,0,0,0.45)" strokeWidth={0.5} />
      <circle cx={x1 + px * 1.3} cy={y1 + py * 1.3} r={0.7} fill="#fff" />
      <circle cx={x1 - px * 1.3} cy={y1 - py * 1.3} r={0.7} fill="#fff" />
    </g>
  );
}
