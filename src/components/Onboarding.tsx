"use client";

import { useEffect, useState } from "react";
import { Sparkles, Wallet, Gamepad2, Swords, User, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { Modal } from "./Modal";
import { cn } from "@/lib/cn";

const KEY = "gambit:onboarded";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to Gambit",
    body: "Five classic games — chess, Naija Whot, tic-tac-toe, snakes & ladders, and a block puzzle. Play free against the bot, or stake USDm on a 1v1 and the winner takes the pot.",
  },
  {
    icon: Wallet,
    title: "Sign in & save your progress",
    body: "Sign in with email, Google or Farcaster — a wallet is created for you automatically, no app or seed phrase needed. Already have a wallet? Connect that instead. Just want to try it? Play free without signing in.",
    connect: true,
  },
  {
    icon: Gamepad2,
    title: "Pick a game & play",
    body: "Tap any game to start instantly vs the bot. Choose “Staked 1v1” to put USDm on the line — sign in once, set your stake, and play.",
  },
  {
    icon: Swords,
    title: "Find real opponents",
    body: "Open “Live rooms” at the top of the games list to join an open staked match — or create your own and share the link with a friend.",
  },
  {
    icon: User,
    title: "Track your progress",
    body: "The “You” tab in the bottom bar holds your XP, daily streak, quests and invite link. Come back each day to keep your streak alive.",
  },
] as const;

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const { isConnected } = useAccount();
  const { login: openWallet } = usePrivy();

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finish = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <Modal open={open} onClose={finish} title="Getting started">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-void-600 text-teal">
          <Icon className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-dim">{step.body}</p>

        {"connect" in step && step.connect && (
          <div className="mt-4">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-teal/40 bg-teal/[0.08] px-3 py-2 text-sm font-medium text-teal">
                <Check className="h-4 w-4" /> Signed in
              </span>
            ) : (
              <button onClick={() => openWallet()} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm shadow-glow">
                <Wallet className="h-4 w-4" /> Sign in
              </button>
            )}
          </div>
        )}
      </div>

      {/* progress dots */}
      <div className="mt-6 flex justify-center gap-1.5">
        {STEPS.map((_, n) => (
          <span key={n} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-5 bg-teal" : "w-1.5 bg-void-600")} />
        ))}
      </div>

      {/* controls */}
      <div className="mt-5 flex items-center justify-between">
        <button onClick={finish} className="text-[13px] font-medium text-ink-faint transition-colors hover:text-ink-dim">
          Skip
        </button>
        <div className="flex items-center gap-2">
          {i > 0 && (
            <button
              onClick={() => setI((v) => v - 1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-void-800 text-ink-dim transition-colors hover:text-ink"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setI((v) => v + 1))}
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm shadow-glow"
          >
            {last ? "Start playing" : "Next"}
            {!last && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
