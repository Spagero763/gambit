"use client";

import { useState } from "react";
import { HelpCircle, Gamepad2, Coins, Trophy, Wallet, Send } from "lucide-react";
import { Modal } from "./Modal";

// The whole money journey in five steps a first-timer can follow.
const STEPS = [
  { icon: Wallet, title: "Sign in, get a wallet", body: "Just your email. A wallet is created for you, think of it as your game account. Add money from MiniPay or any Celo wallet whenever you want." },
  { icon: Gamepad2, title: "Warm up free", body: "Every game is free against the bot. No deposit, no catch, play all day." },
  { icon: Coins, title: "Put money on it", body: "Ready? Stake USDm or G$ on a 1v1 against a real person. Both stakes sit locked in a contract nobody can touch, not even us." },
  { icon: Trophy, title: "Winner takes 95%", body: "Win and the pot lands in your wallet in seconds. A draw refunds both players. If a game stalls, your money is always reclaimable." },
  { icon: Send, title: "Cash out anytime", body: "Your money is yours. Send winnings to any wallet from your profile whenever you like." },
];

/** "How it works" button + modal. Manual only — the first-run tour is Onboarding. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-void-800 px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
      >
        <HelpCircle className="h-3.5 w-3.5" /> How it works
      </button>

      <Modal open={open} onClose={close} title="How Gambit works">
        <ul className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600 text-teal">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-dim">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <button onClick={close} className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow">
          Let&apos;s play
        </button>
      </Modal>
    </>
  );
}
