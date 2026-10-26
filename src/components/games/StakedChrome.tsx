"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatUnits } from "viem";
import { symbolForToken } from "@/lib/tokens";
import { cn } from "@/lib/cn";
import { TurnDot } from "./TurnDot";

const FEE = 0.05;

/** Top of a money match: back, the game, what's at stake, and resign. */
export function StakedHeader({
  title,
  matchId,
  stakeWei,
  decimals,
  token,
  onExit,
  right,
}: {
  title: string;
  matchId: bigint;
  stakeWei?: string | null;
  decimals?: number | null;
  token?: string | null;
  onExit?: () => void;
  right?: ReactNode;
}) {
  const stake = stakeWei ? Number(formatUnits(BigInt(stakeWei), decimals ?? 18)) : null;
  const back = "glass pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink";
  return (
    <div className="flex items-center gap-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))]">
      {onExit ? (
        <button onClick={onExit} aria-label="Back to the cup" className={back}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link href="/" aria-label="Back to games" className={back}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="display truncate text-[22px] font-extrabold leading-tight text-ink">{title}</h1>
        <p className="nums truncate text-[12px] text-ink-faint">
          Room #{matchId.toString()}
          {stake !== null && (
            <>
              {" · "}
              <span className="font-semibold text-teal">
                Winner takes {(stake * 2 * (1 - FEE)).toFixed(2)} {symbolForToken(token)}
              </span>
            </>
          )}
        </p>
      </div>
      {right}
    </div>
  );
}

/** A player's place at a money table, lit in their colour on their turn. */
export function MoneySeat({
  name,
  detail,
  active,
  role,
  icon,
}: {
  name: string;
  detail?: ReactNode;
  active?: boolean;
  role: "you" | "them";
  icon?: ReactNode;
}) {
  return (
    <div data-on={active ? role : undefined} className="seat flex items-center gap-3 rounded-[18px] px-3 py-2.5">
      {icon && <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.06]">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-ink">{name}</p>
        <p className={cn("flex items-center gap-1.5 truncate text-[12px]", active ? (role === "you" ? "text-you" : "text-them") : "text-ink-faint")}>
          {active && <TurnDot />}
          {active ? (role === "you" ? "Your turn" : "Their turn") : detail ?? "Waiting"}
        </p>
      </div>
    </div>
  );
}

/** The end of a money match, over everything, until the payout lands. */
export function ResultLayer({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/65 px-5"
        >
          <motion.div
            initial={{ y: 18, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="panel w-full max-w-sm rounded-[28px] px-5 py-7"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
