"use client";

import { motion } from "framer-motion";
import { Gamepad2, Trophy, Swords, User, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Portal } from "@/components/Portal";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Play", icon: Gamepad2, tour: "play" },
  { href: "/tournaments", label: "Cups", icon: Crown, match: "/tournament", tour: "cups" },
  { href: "/leaderboard", label: "Ranks", icon: Trophy, tour: "ranks" },
  { href: "/events", label: "Events", icon: Swords, tour: "events" },
  { href: "/profile", label: "You", icon: User, tour: "you" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* in-flow spacer: the bar is fixed and content scrolls behind it (like X),
          so the last row of the page needs room to clear above the bar */}
      <div aria-hidden className="h-24" />
      {/* Portaled to <body> so `fixed` locks to the real viewport. Rendered inside
          the page it would sit under framer-motion's transformed page wrapper,
          which traps fixed children and strands the bar at the bottom of the
          scroll instead of the screen (see Portal). */}
      <Portal>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-[min(92%,26rem)]"
        style={{ marginBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
      <div className="flex items-center justify-between rounded-2xl border border-line bg-void-700/95 px-1.5 py-1.5 shadow-pop backdrop-blur">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive =
            t.href === "/" ? pathname === "/" : pathname.startsWith((t as { match?: string }).match ?? t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              data-tour={t.tour}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
            >
              {isActive && (
                <motion.span
                  layoutId="navPill"
                  className="absolute inset-0 rounded-xl bg-void-600"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                >
                  {/* soft accent glow under the active tab */}
                  <span className="absolute inset-x-3 -bottom-1 h-2 rounded-full bg-teal/25 blur-md" />
                </motion.span>
              )}
              <motion.span
                whileTap={{ scale: 0.82 }}
                animate={isActive ? { scale: [1, 1.28, 1], y: [0, -2.5, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <Icon
                  className={cn(
                    "relative h-[19px] w-[19px] transition-colors",
                    isActive ? "text-teal" : "text-ink-faint"
                  )}
                />
              </motion.span>
              <span
                className={cn(
                  "relative text-[10px] font-medium transition-colors",
                  isActive ? "text-ink" : "text-ink-faint"
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
      </nav>
      </Portal>
    </>
  );
}
