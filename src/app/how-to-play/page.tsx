import type { Metadata } from "next";
import Link from "next/link";
import { Gamepad2, Coins, Trophy, Scale, ShieldCheck } from "lucide-react";
import { GAMES } from "@/lib/games";
import { BackLink } from "@/components/BackLink";
import { ExternalA } from "@/components/ExternalA";

export const metadata: Metadata = {
  title: "How to Play | Gambit",
  description: "Every game, the staking rules, and the money journey from first play to cash out.",
};

const JOURNEY = [
  {
    icon: Gamepad2,
    title: "Play free first",
    body: "Every game is free against the bot, with no wallet and no sign in. Warm up as long as you like. Your progress is saved on this device.",
  },
  {
    icon: Coins,
    title: "Stake when you are ready",
    body: "Open any game and pick Play for money. Choose how much to put in, and the same amount comes from the opponent you are matched with. Both entries are locked in an on-chain escrow the moment the match starts.",
  },
  {
    icon: Trophy,
    title: "Winner takes 95%",
    body: "The winner is paid automatically from the contract, in seconds. A draw refunds both players in full.",
  },
  {
    icon: Scale,
    title: "Fair play, enforced",
    body: "Matches have clocks, and an opponent who disappears forfeits after 2 minutes. Your money can never be stuck: stalled matches can always be settled from either side.",
  },
];

const TERMS = [
  "You can stake in USDT, USDC or USDm. 1 of each is worth about 1 dollar, and Gambit reads which one you hold, so just pick the stablecoin you have.",
  "Every transaction has a tiny network fee. In MiniPay it comes out of your stablecoin balance, so there is nothing else to get. Other wallets pay it in a little CELO.",
  "Cashing out is done from your wallet, not from Gambit. In MiniPay, open your wallet and withdraw there. On the web, use the Withdraw button on your profile.",
];

export default function HowToPlayPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}>
      <BackLink />
      <h1 className="mt-4 font-display text-2xl font-bold">How to Play</h1>

      <h2 className="mt-6 text-sm font-semibold text-ink">The money journey</h2>
      <div className="mt-3 space-y-3">
        {JOURNEY.map((j) => (
          <section key={j.title} className="flex gap-3 rounded-2xl border border-line bg-void-800 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600 text-teal">
              <j.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">{j.title}</h3>
              <p className="mt-1 text-[16px] leading-relaxed text-ink-dim">{j.body}</p>
            </div>
          </section>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-ink">The games</h2>
      <div className="mt-3 space-y-3">
        {GAMES.map((g) => (
          <section key={g.slug} className="rounded-2xl border border-line bg-void-800 p-4">
            <h3 className="text-sm font-semibold text-ink">{g.name}</h3>
            <p className="mt-1 text-[16px] leading-relaxed text-ink-dim">{g.description}</p>
          </section>
        ))}
      </div>

      <h2 className="mt-6 text-sm font-semibold text-ink">Staking in short</h2>
      <ul className="mt-3 space-y-2.5">
        {TERMS.map((t, i) => (
          <li key={i} className="flex gap-2.5 rounded-2xl border border-line bg-void-800 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <span className="text-[16px] leading-relaxed text-ink-dim">{t}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[14px] text-ink-faint">
        Need a hand? Message us on{" "}
        <ExternalA
          className="text-teal underline decoration-teal/40 underline-offset-2"
          href="https://wa.me/2348060158364?text=Hi%20Gambit%20support%2C%20I%20need%20help%20with"
        >
          WhatsApp
        </ExternalA>
        . Also see{" "}
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/about">
          About Gambit
        </Link>
        ,{" "}
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/terms">
          Terms
        </Link>{" "}
        and{" "}
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/privacy">
          Privacy
        </Link>
        .
      </p>
    </main>
  );
}
