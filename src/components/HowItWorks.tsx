"use client";

import { useState } from "react";
import { HelpCircle, Gamepad2, Coins, Trophy, Wallet, ArrowDownToLine } from "lucide-react";
import { useInMiniPay } from "@/lib/minipay";
import { Modal } from "./Modal";

// The whole money journey in five steps a first-timer can follow.
const STEPS = [
  { icon: Gamepad2, title: "Play vs AI", body: "Every game, free, as long as you like." },
  { icon: Coins, title: "1v1 for money", body: "Face a real person. Both entries stay locked until the game ends." },
  { icon: Trophy, title: "Winner takes 95%", body: "Paid to your wallet in seconds. A draw refunds both." },
];

// Step one reads differently depending on where you opened Gambit: in MiniPay
// you are already signed in with a funded wallet, on the web you are not.
const FIRST_MINIPAY = {
  icon: Wallet,
  title: "You are already in",
  body: "MiniPay signs you in. Nothing to set up.",
};
const FIRST_WEB = {
  icon: Wallet,
  title: "Sign in, get a wallet",
  body: "Just your email. A wallet is made for you.",
};

// Cashing out is MiniPay's own screen inside the Mini App, so pointing at a
// Gambit withdraw button there would send players somewhere that no longer
// exists (review item 5).
const LAST_MINIPAY = {
  icon: ArrowDownToLine,
  title: "Cash out anytime",
  body: "Withdraw from your MiniPay wallet whenever you like.",
};
const LAST_WEB = {
  icon: ArrowDownToLine,
  title: "Cash out anytime",
  body: "Withdraw to any wallet from your profile.",
};

/** "How it works" button + modal. Manual only, the first-run tour is Onboarding. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const miniPay = useInMiniPay();
  const close = () => setOpen(false);

  const steps = [miniPay ? FIRST_MINIPAY : FIRST_WEB, ...STEPS, miniPay ? LAST_MINIPAY : LAST_WEB];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-teal transition-opacity hover:opacity-80"
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
                  <p className="mt-0.5 text-[16px] leading-relaxed text-ink-dim">{s.body}</p>
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
