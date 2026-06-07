"use client";

import { useState } from "react";
import { HelpCircle, Gamepad2, Coins, Trophy, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";

const STEPS = [
  { icon: Gamepad2, title: "Pick a game", body: "Chess, Whot, tic-tac-toe, snakes & ladders or a block puzzle." },
  { icon: Coins, title: "Play free, or stake", body: "Practise free vs the engine — or put cUSD on a 1v1 against a real person." },
  { icon: Trophy, title: "Winner takes the pot", body: "Win and you collect both stakes (minus a small 5% fee). A draw refunds both." },
  { icon: ShieldCheck, title: "Safe & on-chain", body: "Stakes sit in an audited escrow contract on Celo and pay out automatically. If a game stalls, funds are always reclaimable." },
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
