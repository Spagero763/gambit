import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Privacy Policy | Gambit",
  description: "What Gambit stores and what it never touches.",
};

/** Plain-language privacy policy. Required for the MiniPay listing. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}>
      <BackLink />
      <h1 className="mt-4 font-display text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-xs text-ink-faint">Last updated: July 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink-dim">
        <section>
          <h2 className="mb-1 font-semibold text-ink">The short version</h2>
          <p>
            Gambit stores as little as possible. Your wallet address and your match history are the heart of it,
            and most of that is public blockchain data anyway. We do not sell data, run ad trackers, or ask for
            documents.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">What we store</h2>
          <p>
            Your wallet address, a display name and avatar if you set one, match and tournament records, XP and
            reward claims. This lives in our database so your profile and history work across devices. On chain
            activity (stakes, settlements, prizes) is public on Celo by nature.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Sign in</h2>
          <p>
            Sign in is handled by Privy. If you use email or a social account, Privy manages that credential and
            creates your embedded wallet; we receive your wallet address, not your password. Inside MiniPay,
            your MiniPay wallet connects directly and no email is involved.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">On your device</h2>
          <p>
            We use local storage for preferences like sound settings, tutorial progress and your session token.
            Push notifications are strictly opt in and you can turn them off any time in your browser or device
            settings.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">What we never touch</h2>
          <p>
            Your private keys, your seed phrase, your Privy password, your biometrics. Gambit is non custodial
            and has no access to move funds from your wallet without a transaction you approve.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-ink">Questions</h2>
          <p>
            Ask anything or request deletion of your profile data by opening an issue at{" "}
            <a className="text-teal underline" href="https://github.com/Spagero763/gambit/issues">
              github.com/Spagero763/gambit/issues
            </a>
            .
          </p>
        </section>

        <p>
          See also our <Link className="text-teal underline" href="/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}
