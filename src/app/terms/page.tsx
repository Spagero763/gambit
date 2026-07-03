import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Gambit",
  description: "The rules of playing on Gambit.",
};

/** Plain-language terms. Required for the MiniPay listing; useful everywhere. */
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <h1 className="font-display text-2xl font-bold">Terms of Service</h1>
      <p className="mt-1 text-xs text-ink-faint">Last updated: July 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-dim">
        <section>
          <h2 className="mb-1 font-semibold text-ink">What Gambit is</h2>
          <p>
            Gambit is a skill gaming platform on the Celo network. You can play every game free. You can also
            choose to stake stablecoins on head to head matches against other players, where the winner receives
            the pot minus a 5% platform fee. Results are settled by smart contracts on Celo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Who can play</h2>
          <p>
            Free play is open to everyone. Staked matches are for players aged 18 or older, and only where
            participating in skill based competitions for money is legal. You are responsible for knowing the
            rules that apply where you live.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Your wallet, your money</h2>
          <p>
            Gambit is non custodial. Your funds sit in your own wallet, and stakes are held by an open source
            escrow contract until a match settles. We never hold your money and we cannot reverse blockchain
            transactions. Double check addresses and amounts before you confirm anything.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Fair play</h2>
          <p>
            One account per person. Bots, exploits, collusion and multi account play in prized events are
            prohibited. Prized tournaments may require proof that you are a unique human (for example GoodDollar
            verification). We may exclude wallets that break these rules from prized events.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Stakes and settlement</h2>
          <p>
            Match results are reported to the escrow contract, which pays the winner automatically. Unfilled
            rooms can be cancelled for a full refund, and stalled matches can be reclaimed after a waiting
            period, both enforced by the contract itself. The platform fee is 5% of the pot.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">No warranties</h2>
          <p>
            Gambit is provided as is. We work hard to keep it fast and fair, but we cannot promise uninterrupted
            service, and we are not liable for losses caused by network congestion, wallet issues or blockchain
            behaviour outside our control. Never stake more than you can afford to lose.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Changes</h2>
          <p>
            We may update these terms as the product grows. The latest version always lives on this page.
            Questions or problems: open an issue at{" "}
            <a className="text-teal underline" href="https://github.com/Spagero763/gambit/issues">
              github.com/Spagero763/gambit/issues
            </a>
            .
          </p>
        </section>

        <p>
          See also our <Link className="text-teal underline" href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
