"use client";

import { motion } from "framer-motion";
import { Wallet, Trophy, Swords, Coins, Flame } from "lucide-react";
import { useAccount, useBalance, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { CUSD_ADDRESS } from "@/lib/wagmi";
import { cn } from "@/lib/cn";

const RECENT = [
  { game: "Chess", result: "win", delta: "+0.95", mode: "Staked" },
  { game: "Tic-Tac-Toe", result: "win", delta: "+0.19", mode: "Staked" },
  { game: "Chess", result: "lose", delta: "-0.50", mode: "Staked" },
  { game: "Tic-Tac-Toe", result: "draw", delta: "0.00", mode: "Free" },
];

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function Profile() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { data: bal } = useBalance({
    address,
    token: CUSD_ADDRESS,
    query: { enabled: !!address },
  });

  if (!isConnected || !address) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
        <h1 className="font-display text-2xl font-bold">Your profile</h1>
        <div className="mt-6 rounded-3xl glass p-8 text-center shadow-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-deep to-teal-deep">
            <Wallet className="h-6 w-6 text-white" />
          </span>
          <p className="mt-4 text-sm text-ink-dim">
            Connect to see your record, winnings and streak.
          </p>
          <button
            onClick={() => connect({ connector: injected() })}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-deep to-violet py-3 text-sm font-bold text-white shadow-glow"
          >
            Connect wallet
          </button>
        </div>
      </section>
    );
  }

  const amount = bal ? Number(bal.formatted).toFixed(2) : "0.00";

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-28 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet to-teal text-lg font-bold text-void">
          {address.slice(2, 4).toUpperCase()}
        </span>
        <div>
          <h1 className="font-mono text-lg font-bold">{short(address)}</h1>
          <p className="text-sm text-teal">{amount} cUSD</p>
        </div>
      </motion.div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat icon={Coins} label="Total earned" value="0.64 cUSD" accent="text-teal" />
        <Stat icon={Trophy} label="XP" value="2,140" accent="text-violet-bright" />
        <Stat icon={Swords} label="Record" value="38W · 12L" accent="text-ink" />
        <Stat icon={Flame} label="Streak" value="4 wins" accent="text-amber" />
      </div>

      <h2 className="mb-3 mt-7 font-display text-lg font-bold">Recent matches</h2>
      <ul className="space-y-2">
        {RECENT.map((m, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold">{m.game}</p>
              <p className="text-[11px] text-ink-faint">{m.mode}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                  m.result === "win" && "bg-teal/15 text-teal",
                  m.result === "lose" && "bg-rose/15 text-rose",
                  m.result === "draw" && "bg-white/10 text-ink-dim"
                )}
              >
                {m.result}
              </span>
              <span
                className={cn(
                  "w-14 text-right font-mono text-sm",
                  m.delta.startsWith("+") && "text-teal",
                  m.delta.startsWith("-") && "text-rose",
                  m.delta === "0.00" && "text-ink-faint"
                )}
              >
                {m.delta}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl glass p-4 shadow-card">
      <Icon className={cn("h-4 w-4", accent)} />
      <p className={cn("mt-3 font-display text-lg font-bold", accent)}>{value}</p>
      <p className="text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}
