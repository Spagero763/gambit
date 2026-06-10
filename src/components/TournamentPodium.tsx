"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, ExternalLink, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PublicProfile, displayName, avatarHex } from "@/lib/profiles";
import { play } from "@/lib/sfx";
import { useEffect } from "react";

const CONFETTI_COLORS = ["#3ecf8e", "#aaa7ff", "#e3b341", "#e06c8b", "#f4f4f5"];

function Confetti() {
  // deterministic-ish pieces, generated once
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        x: Math.random() * 100,
        delay: Math.random() * 2.2,
        dur: 3 + Math.random() * 2.4,
        size: 6 + Math.random() * 7,
        rot: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() < 0.35,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-[-5%]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
          }}
          initial={{ y: "-5vh", opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0.9, 0.7], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen podium celebration when a tournament settles: confetti rain,
 * pedestals rising for 1st/2nd/3rd with names, avatars and prize amounts,
 * a crown dropping onto the champion, and the on-chain payout link.
 */
export function TournamentPodium({
  winners,
  profiles,
  pot,
  sym,
  settleTx,
  explorer,
  me,
  onClose,
}: {
  winners: string[]; // [1st, 2nd, 3rd]
  profiles: Record<string, PublicProfile>;
  pot: number;
  sym: string;
  settleTx?: string | null;
  explorer?: string;
  me?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    play("win");
  }, []);

  const split = [0.5, 0.3, 0.2];
  // visual order: 2nd, 1st, 3rd
  const order = [1, 0, 2].filter((i) => winners[i]);
  const HEIGHTS = [128, 92, 72]; // by rank (1st tallest)
  const MEDes = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-void/92 px-5 backdrop-blur-md"
    >
      <Confetti />

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>

      <motion.p
        initial={{ opacity: 0, y: 18, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-3xl font-black tracking-tight text-ink"
      >
        Champions
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-1 text-sm text-ink-dim"
      >
        The pot has been paid out on-chain.
      </motion.p>

      {/* podium */}
      <div className="mt-8 flex w-full max-w-sm items-end justify-center gap-3">
        {order.map((rank) => {
          const addr = winners[rank];
          const p = profiles[addr?.toLowerCase()];
          const isMe = me && addr?.toLowerCase() === me;
          const prize = pot * split[rank];
          return (
            <div key={addr} className="flex w-1/3 flex-col items-center">
              {/* avatar + crown drop in */}
              <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5 + rank * 0.25, type: "spring", stiffness: 260, damping: 18 }}
                className="relative mb-2"
              >
                {rank === 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: -26, rotate: -18 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: 1.35, type: "spring", stiffness: 300, damping: 14 }}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber"
                  >
                    <Crown className="h-6 w-6 fill-amber/30" />
                  </motion.span>
                )}
                <Avatar
                  image={p?.avatar_image || undefined}
                  color={avatarHex(p)}
                  name={displayName(addr ?? "", p)}
                  size={rank === 0 ? 64 : 52}
                  rounded="rounded-2xl"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 + rank * 0.25 }}
                className="max-w-full truncate text-center text-[13px] font-semibold text-ink"
              >
                {displayName(addr ?? "", p)}
                {isMe ? <span className="text-teal"> (you)</span> : null}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85 + rank * 0.25 }}
                className="nums text-[12px] font-bold text-teal"
              >
                +{prize.toFixed(2)} {sym}
              </motion.p>

              {/* pedestal rises from the floor */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: HEIGHTS[rank] }}
                transition={{ delay: 0.35 + rank * 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mt-2 w-full rounded-t-xl border border-b-0 border-line"
                style={{
                  background:
                    rank === 0
                      ? "linear-gradient(180deg, rgba(227,179,65,0.32), rgba(227,179,65,0.08))"
                      : rank === 1
                        ? "linear-gradient(180deg, rgba(244,244,245,0.22), rgba(244,244,245,0.05))"
                        : "linear-gradient(180deg, rgba(192,132,87,0.28), rgba(192,132,87,0.07))",
                }}
              >
                <p className="mt-2 text-center text-xl">{MEDes[rank]}</p>
              </motion.div>
            </div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="mt-7 flex flex-col items-center gap-3"
      >
        {settleTx && explorer && (
          <a
            href={`${explorer}${settleTx}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-ink"
          >
            View payout on Celoscan <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button onClick={onClose} className="btn-primary rounded-2xl px-8 py-3 text-sm shadow-glow">
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
