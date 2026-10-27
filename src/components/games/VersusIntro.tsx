"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { useMatchPlayers, useMatchState } from "@/hooks/useStakeMatch";
import { useProfiles, displayName, avatarHex } from "@/lib/profiles";
import { useSettings, AVATAR_HEX } from "@/lib/settings";
import { decimalsForToken, symbolForToken } from "@/lib/tokens";
import { FEE_BPS } from "@/lib/escrow";
import { Avatar } from "@/components/Avatar";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { winEase } from "@/lib/motion";
import { play } from "@/lib/sfx";

const HOLD_MS = 2600;

// Both seats are filled and the money is in: the two players meet, the pot
// lands between them, then the board. A tap anywhere skips it.
export function VersusIntro({ matchId, you, onDone }: { matchId: bigint; you: `0x${string}`; onDone: () => void }) {
  const { data: m } = useMatchState(matchId);
  const { data: seats } = useMatchPlayers(matchId);
  const me = you.toLowerCase();
  const opp = (seats as readonly string[] | undefined)?.find((a) => a.toLowerCase() !== me);
  const profiles = useProfiles(opp ? [opp] : []);
  const p = opp ? profiles[opp.toLowerCase()] : undefined;
  const oppName = opp ? displayName(opp, p) : "Opponent";
  const [settings] = useSettings();

  const t = m as readonly unknown[] | undefined;
  const token = t ? String(t[0]) : null;
  const stake = t ? Number(formatUnits(BigInt(t[2] as bigint), decimalsForToken(token))) : null;
  const pot = stake !== null ? stake * 2 * (1 - FEE_BPS / 10_000) : null;
  const symbol = symbolForToken(token);

  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const hit = setTimeout(() => play("versus"), 80);
    const end = setTimeout(() => done.current(), HOLD_MS);
    return () => {
      clearTimeout(hit);
      clearTimeout(end);
    };
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label="Match found. Tap to start"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[150] flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: "radial-gradient(120% 70% at 50% 50%, rgba(13,22,34,0.97), rgba(5,7,12,0.99))" }}
    >
      <Seat side="them" name={oppName} delay={0.05}>
        <Avatar image={p?.avatar_image || undefined} color={avatarHex(p)} name={oppName} size={72} rounded="rounded-[22px]" />
      </Seat>

      <div className="relative my-7 grid w-full place-items-center">
        <span aria-hidden className="absolute -inset-x-6 top-1/2 h-px">
          <motion.span
            className="block h-full w-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(62,224,155,0.8), transparent)" }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
        <span aria-hidden className="absolute h-28 w-28 rounded-full border-2 border-teal/50 opacity-0" style={{ animation: "ring 900ms 360ms cubic-bezier(0.22,1,0.36,1) forwards" }} />
        <motion.p
          className="display text-glow relative text-[64px] font-extrabold italic leading-none"
          initial={{ scale: 2.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.42, ease: winEase }}
        >
          VS
        </motion.p>
      </div>

      <Seat side="you" name="You" delay={0.05}>
        <Avatar image={settings.avatarImage || undefined} color={AVATAR_HEX[settings.avatar] ?? AVATAR_HEX.teal} name={settings.name || "You"} size={72} rounded="rounded-[22px]" />
      </Seat>

      <motion.div
        className="mt-8 rounded-full border border-teal/35 bg-teal/[0.1] px-5 py-2.5 shadow-[0_0_32px_-10px_rgba(62,224,155,0.75)]"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: pot !== null ? 1 : 0 }}
        transition={{ delay: 0.62, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[14px] font-semibold text-ink-dim">
          Winner takes{" "}
          {pot !== null && (
            <AnimatedNumber value={pot} from={0} decimals={2} durationMs={1000} suffix={` ${symbol}`} className="display text-[17px] font-extrabold text-teal" />
          )}
        </p>
      </motion.div>

      <motion.p
        className="absolute bottom-[calc(28px+env(safe-area-inset-bottom))] text-[14px] text-ink-faint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        Tap to start
      </motion.p>
    </motion.button>
  );
}

function Seat({ side, name, delay, children }: { side: "you" | "them"; name: string; delay: number; children: React.ReactNode }) {
  const them = side === "them";
  return (
    <motion.div
      className="flex flex-col items-center gap-2.5"
      initial={{ y: them ? -90 : 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
    >
      <span
        className="rounded-[26px] p-1"
        style={{
          background: them ? "linear-gradient(180deg, rgba(255,181,71,0.5), rgba(255,181,71,0.1))" : "linear-gradient(180deg, rgba(90,169,255,0.5), rgba(90,169,255,0.1))",
          boxShadow: them ? "0 0 40px -8px rgba(255,181,71,0.55)" : "0 0 40px -8px rgba(90,169,255,0.6)",
        }}
      >
        {children}
      </span>
      <span className="max-w-[16rem] truncate text-[18px] font-bold text-ink">{name}</span>
    </motion.div>
  );
}
