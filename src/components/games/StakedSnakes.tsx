"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Dices } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitMove } from "@/lib/matchClient";
import { SNAKES_LADDERS, centerFrac } from "@/lib/games/snakesLayout";
import { SettleOverlay } from "./SettleOverlay";
import { ResignButton } from "./ResignButton";
import { TimeoutClaim } from "./TimeoutClaim";
import { MatchChat } from "./MatchChat";
import { StakedHeader, MoneySeat, ResultLayer } from "./StakedChrome";

const YOU_HEX = "#5aa9ff";
const THEM_HEX = "#ffb547";
import { useProfiles, displayName } from "@/lib/profiles";
import { play } from "@/lib/sfx";
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

export function StakedSnakes({ matchId, you, onExit }: { matchId: bigint; you: `0x${string}`; onExit?: () => void }) {
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
    play("roll");
    try {
      const res = await submitMove(matchId, me, { roll: true });
      if (res.state) setMatch((m) => (m ? { ...m, state: res.state as SnakesState } : m));
      play(res.finished ? (res.winner?.toLowerCase() === me ? "win" : "lose") : "place");
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Roll failed");
    } finally {
      setBusy(false);
    }
  };

  // sounds for the opponent's roll (your turn again) and game end
  const prevTurnRef = useRef<string | undefined>(undefined);
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!match) return;
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      play(iWon ? "win" : "lose");
    }
    const t = match.state?.turn;
    if (prevTurnRef.current && prevTurnRef.current !== t && t === me && match.status === "active") play("roll");
    prevTurnRef.current = t;
  }, [match, finished, iWon, me]);

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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
      <StakedHeader
        title="Snakes & Ladders"
        matchId={matchId}
        stakeWei={match?.stake}
        decimals={match?.decimals}
        token={match?.token}
        onExit={onExit}
        right={match?.status === "active" ? <ResignButton matchId={matchId} you={me} /> : null}
      />

      <MoneySeat
        role="them"
        name={oppName}
        detail={`On square ${oppPos}`}
        active={match?.status === "active" && !myTurn}
        icon={<span className="h-4 w-4 rounded-full ring-2 ring-white/40" style={{ background: THEM_HEX }} />}
      />

      <TimeoutClaim matchId={matchId} me={me} turn={match?.state?.turn} updatedAt={match?.updated_at} status={match?.status} />

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
            <Token pos={oppPos} color={THEM_HEX} offset={2.5} z={10} />
            <Token pos={myPos} color={YOU_HEX} offset={-2.5} z={20} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <motion.div
          key={dice}
          initial={{ rotate: -12, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          className="grid h-14 w-14 shrink-0 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl border border-black/20 p-2"
          style={{
            background: "linear-gradient(145deg, #fdfaf2, #ddd5c2)",
            boxShadow: "inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -3px 5px rgba(0,0,0,0.25), 0 10px 24px -10px rgba(0,0,0,0.7)",
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
            return <span key={i} className={cn("m-auto h-2 w-2 rounded-full", pips[dice]?.includes(i) ? "bg-[#16131d]" : "bg-transparent")} />;
          })}
        </motion.div>
        <button
          onClick={roll}
          disabled={!myTurn || busy || finished}
          className="btn-primary pressable inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[17px]"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Dices className="h-5 w-5" />} Roll
        </button>
      </div>
      <p className="mt-2 text-center text-[14px] text-ink-dim">{status}</p>
      {err && <p className="mt-1 text-center text-[12px] text-rose">{err}</p>}

      <div className="mt-auto pt-3">
        <MoneySeat
          role="you"
          name="You"
          detail={`On square ${myPos}`}
          active={!!myTurn}
          icon={<span className="h-4 w-4 rounded-full ring-2 ring-white/40" style={{ background: YOU_HEX }} />}
        />
      </div>
      <MatchChat matchId={matchId} me={me} />

      <ResultLayer open={finished}>
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
      </ResultLayer>
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
