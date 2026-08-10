"use client";

import Link from "next/link";
import { BookOpen, Info, LifeBuoy, ScrollText, Lock, ChevronRight, ExternalLink } from "lucide-react";

const SUPPORT = "https://wa.me/2348060158364?text=Hi%20Gambit%20support%2C%20I%20need%20help%20with";

/**
 * One place that answers "where is the legal stuff and how do I get help?".
 *
 * The MiniPay review asked for Privacy Policy, Terms, Support, About and How to
 * Play to be clearly reachable (item 8). They existed but were scattered, and
 * the header's help button had to go to stop it colliding with the wordmark, so
 * this block on the You screen is now their single home.
 */
const LINKS = [
  { href: "/how-to-play", icon: BookOpen, label: "How to play", sub: "Rules, staking and cashing out", tint: "text-teal" },
  { href: "/about", icon: Info, label: "About Gambit", sub: "What it is and who builds it", tint: "text-violet-bright" },
  { href: "/terms", icon: ScrollText, label: "Terms & Conditions", sub: "The rules you agree to", tint: "text-amber" },
  { href: "/privacy", icon: Lock, label: "Privacy Policy", sub: "What we store, what we never touch", tint: "text-ink-dim" },
];

export function InfoLinks() {
  return (
    <div className="mt-7">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Help & info</p>

      <div className="space-y-2">
        {/* support first: someone opening this block usually wants a person */}
        <a
          href={SUPPORT}
          target="_blank"
          rel="noreferrer"
          className="pressable flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/[0.07] px-4 py-3.5 transition-colors hover:border-teal/50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">Support</span>
            <span className="block truncate text-[11px] text-ink-faint">Message us on WhatsApp, a real person replies</span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-ink-faint" />
        </a>

        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="pressable flex items-center gap-3 rounded-2xl border border-line bg-void-800 px-4 py-3.5 transition-colors hover:border-line-strong"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-void-600">
              <l.icon className={`h-4 w-4 ${l.tint}`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{l.label}</span>
              <span className="block truncate text-[11px] text-ink-faint">{l.sub}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
          </Link>
        ))}
      </div>
    </div>
  );
}
