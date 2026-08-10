"use client";

import { useState } from "react";
import { HelpCircle, Gamepad2, Coins, Trophy, Wallet, ArrowDownToLine } from "lucide-react";
import { useInMiniPay } from "@/lib/minipay";
import { Modal } from "./Modal";

// The whole money journey in five steps a first-timer can follow.
const STEPS = [
  { icon: Gamepad2, title: "Warm up free", body: "Every game is free against the bot. No deposit, no catch, play all day." },
  { icon: Coins, title: "Enter a real match", body: "Ready? Pay a small entry fee to face a real person. Both entries sit locked in a contract nobody can touch, not even us. Pure skill, no luck, no house playing against you." },
  { icon: Trophy, title: "Winner takes 95%", body: "Win and the prize lands in your wallet in seconds. A draw refunds both players. If a game stalls, your money is always reclaimable." },
];

// Step one reads differently depending on where you opened Gambit: in MiniPay
// you are already signed in with a funded wallet, on the web you are not.
const FIRST_MINIPAY = {
  icon: Wallet,
  title: "You are already in",
  body: "MiniPay signs you in the moment you open Gambit. Your wallet and your stablecoins come with you, nothing to create and nothing to sign up for.",
};
const FIRST_WEB = {
  icon: Wallet,
  title: "Sign in, get a wallet",
  body: "Just your email. A wallet is created for you, think of it as your game account. Add money from MiniPay or any Celo wallet whenever you want.",
};

// Cashing out is MiniPay's own screen inside the Mini App, so pointing at a
// Gambit withdraw button there would send players somewhere that no longer
// exists (review item 5).
const LAST_MINIPAY = {
  icon: ArrowDownToLine,
  title: "Cash out anytime",
  body: "Your winnings are yours the second they land. Withdraw them from your MiniPay wallet whenever you like.",
};
const LAST_WEB = {
  icon: ArrowDownToLine,
  title: "Cash out anytime",
  body: "Your money is yours. Withdraw your winnings to any wallet from your profile whenever you like.",
};

/** "How it works" button + modal. Manual only — the first-run tour is Onboarding. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const miniPay = useInMiniPay();
  const close = () => setOpen(false);

  const steps = [miniPay ? FIRST_MINIPAY : FIRST_WEB, ...STEPS, miniPay ? LAST_MINIPAY : LAST_WEB];

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
          {steps.map((s, i) => {
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
