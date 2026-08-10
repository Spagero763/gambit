import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Coins, Cpu, Users } from "lucide-react";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = {
  title: "About Gambit",
  description: "What Gambit is, who builds it, and how the money works.",
};

const FACTS = [
  {
    icon: Cpu,
    title: "Skill, not chance",
    body: "Chess, Naija Whot, tic-tac-toe, snakes & ladders and a block puzzle. You win by playing better than the person across from you. There is no house hand, no odds set against you, and nothing random deciding who takes the pot.",
  },
  {
    icon: ShieldCheck,
    title: "Nobody can touch the pot",
    body: "Both entry fees go into a contract on Celo the moment a match starts. Not a company account, a contract. It pays the winner automatically and it has no withdraw function, so even we cannot move your stake.",
  },
  {
    icon: Coins,
    title: "Winner takes 95%",
    body: "The remaining 5% keeps Gambit running. A draw refunds both players in full, and if a match stalls, either player can reclaim their money from the contract without asking anyone.",
  },
  {
    icon: Users,
    title: "Built in Nigeria",
    body: "Gambit is built by Spagero, for players who grew up on these games. It runs on Celo because fees are small enough that a 1 stablecoin match still makes sense.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}>
      <BackLink />
      <h1 className="mt-4 font-display text-2xl font-bold">About Gambit</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-dim">
        The games you grew up playing, with a real opponent and a real pot. Play free against the bot for as long as you
        like, and put money on it only when you want to.
      </p>

      <div className="mt-6 space-y-3">
        {FACTS.map((f) => (
          <section key={f.title} className="flex gap-3 rounded-2xl border border-line bg-void-800 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600 text-teal">
              <f.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">{f.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{f.body}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-void-800 p-4">
        <h2 className="text-sm font-semibold text-ink">Play responsibly</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
          Staked matches put real money at risk and you can lose it. Only stake what you can afford to lose, and if
          playing stops being fun, stop. Gambit is for adults.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/how-to-play">
          How to play
        </Link>
        <span className="text-ink-faint">·</span>
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/terms">
          Terms
        </Link>
        <span className="text-ink-faint">·</span>
        <Link className="text-teal underline decoration-teal/40 underline-offset-2" href="/privacy">
          Privacy
        </Link>
      </div>
    </main>
  );
}
