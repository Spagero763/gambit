"use client";

import { Settings as SettingsIcon, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "./Logo";
import { WalletPill } from "./WalletPill";

/** Sticky header that condenses as you scroll — the chrome feels alive. */
export function Header() {
  const { scrollY } = useScroll();
  const padY = useTransform(scrollY, [0, 90], [14, 8]);
  const logoScale = useTransform(scrollY, [0, 90], [1, 0.9]);
  const lineOpacity = useTransform(scrollY, [0, 90], [0, 1]);

  return (
    <header className="sticky top-0 z-50">
      {/* solid fade so content scrolls cleanly under the bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-void/85 backdrop-blur-sm mask-fade-b" />
      <motion.div
        style={{ opacity: lineOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <motion.div
        style={{ paddingTop: padY, paddingBottom: padY }}
        className="relative mx-auto flex w-full max-w-2xl items-center justify-between px-5"
      >
        <Link href="/" aria-label="Home">
          <motion.div style={{ scale: logoScale, transformOrigin: "left center" }} whileTap={{ scale: 0.94 }}>
            <Logo />
          </motion.div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            aria-label="How Gambit works"
            onClick={() => window.dispatchEvent(new Event("gambit:tour"))}
            className="hidden h-10 w-10 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink min-[390px]:grid"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>
          <Link
            href="/settings"
            aria-label="Settings"
            className="group grid h-10 w-10 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink"
          >
            <SettingsIcon className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:rotate-90" />
          </Link>
          <WalletPill />
        </div>
      </motion.div>
    </header>
  );
}
