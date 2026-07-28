import Link from "next/link";
import { ShieldCheck, LineChart, Code2, ExternalLink } from "lucide-react";

const ESCROW = "0xB34548Ad3A45C2a571f99341e5fb32abB4FACd05";

// The "you don't have to trust us" surface. Reviewers flagged that a real-money
// game shows no way to check the escrow, the payouts, or the code — so a first
// timer has to take the 95% promise on faith. Every link here is verifiable.
const LINKS = [
  {
    href: `https://celoscan.io/address/${ESCROW}`,
    icon: ShieldCheck,
    label: "Verified contract",
    sub: "The escrow that holds every stake",
  },
  {
    href: "https://dune.com/spagero763/gambit-analytics",
    icon: LineChart,
    label: "On-chain analytics",
    sub: "Every match and payout, public",
  },
  {
    href: "https://github.com/Spagero763/gambit",
    icon: Code2,
    label: "Open source",
    sub: "Read the code yourself",
  },
];

/** A quiet trust strip near the foot of the home page. Static links only — no
 *  state, no effects, nothing to loop. */
export function TrustStrip() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-4 lg:max-w-6xl">
      <div className="rounded-3xl border border-line bg-void-800/60 p-5">
        <p className="text-center text-[13px] font-semibold text-ink">Don&apos;t trust us. Verify it.</p>
        <p className="mx-auto mt-1 max-w-md text-center text-[12px] leading-snug text-ink-faint">
          Your stake sits in a contract nobody can touch, and the winner is paid on-chain. All of it is public.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-2xl border border-line bg-void-700 p-3.5 transition-colors hover:border-teal/40"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                  {l.label}
                  <ExternalLink className="h-3 w-3 text-ink-faint transition-colors group-hover:text-teal" />
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{l.sub}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Prefer the in-app view?{" "}
          <Link href="/stats" className="text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal">
            Live stats
          </Link>
        </p>
      </div>
    </section>
  );
}
