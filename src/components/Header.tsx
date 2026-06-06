"use client";

import { Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { WalletPill } from "./WalletPill";

export function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* solid fade so content scrolls cleanly under the bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-void/85 backdrop-blur-sm mask-fade-b" />
      <div className="relative mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3.5">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-void-700 text-ink-dim transition-colors hover:text-ink"
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </Link>
          <WalletPill />
        </div>
      </div>
    </header>
  );
}
