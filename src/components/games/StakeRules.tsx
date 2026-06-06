"use client";

import { Coins, Trophy, Scale, AlarmClock, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Game } from "@/lib/games";

const GAME_RULES: Record<string, string> = {
  chess: "Standard chess. Deliver checkmate to win. You also win if your opponent runs out of time or abandons.",
  "tic-tac-toe": "Get three of your marks in a row — across, down, or diagonally.",
  snakes: "Take turns rolling a die toward square 100. Ladders lift you up, snakes drop you down. Land exactly on 100 to win.",
  whot: "Match the top card by shape or number, and use specials (Pick Two, Hold On, Suspension…). First to shed every card wins.",
  blocks: "Solo puzzle — score-based, not staked.",
};

const TERMS = [
  { icon: Coins, text: "Both players stake the same cUSD amount into an on-chain escrow." },
  { icon: Trophy, text: "Win and you take the pot — both stakes, minus a 5% fee." },
  { icon: Scale, text: "A draw refunds both players in full." },
  { icon: AlarmClock, text: "If your opponent abandons, you can claim the win after 2 minutes." },
  { icon: ShieldCheck, text: "Funds are held in an audited escrow and pay out automatically. Nothing can get stuck — stalled stakes are always reclaimable." },
];

export function StakeRules({ game, open, onClose }: { game: Game; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`${game.name} · staked`}>
      <p className="rounded-xl border border-line bg-void-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-dim">
        <span className="font-semibold text-ink">How to win: </span>
        {GAME_RULES[game.slug] ?? game.description}
      </p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">Staking terms</p>
      <ul className="space-y-2.5">
        {TERMS.map((t, i) => {
          const Icon = t.icon;
          return (
            <li key={i} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <span className="text-[13px] leading-relaxed text-ink-dim">{t.text}</span>
            </li>
          );
        })}
      </ul>

      <button onClick={onClose} className="btn-primary mt-5 w-full rounded-xl py-3 text-sm shadow-glow">
        Got it
      </button>
    </Modal>
  );
}
