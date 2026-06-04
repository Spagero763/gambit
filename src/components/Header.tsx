"use client";

import { motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { WalletPill } from "./WalletPill";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4"
    >
      <div className="absolute inset-x-0 top-0 h-full -z-10 bg-void/60 backdrop-blur-md mask-fade-b" />
      <Logo />
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          aria-label="Settings"
          className="grid h-10 w-10 place-items-center rounded-full glass text-ink-dim transition-colors hover:text-ink"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>
        <WalletPill />
      </div>
    </motion.header>
  );
}
