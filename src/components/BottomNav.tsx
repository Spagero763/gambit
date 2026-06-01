"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Trophy, Swords, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "play", label: "Play", icon: Gamepad2 },
  { id: "ranks", label: "Ranks", icon: Trophy },
  { id: "events", label: "Events", icon: Swords },
  { id: "you", label: "You", icon: User },
];

export function BottomNav() {
  const [active, setActive] = useState("play");

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 24 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 w-[min(92%,28rem)]"
    >
      <div className="flex items-center justify-between rounded-2xl glass px-2 py-2 shadow-card">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
            >
              {isActive && (
                <motion.span
                  layoutId="navPill"
                  className="absolute inset-0 rounded-xl bg-white/8"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-5 w-5 transition-colors",
                  isActive ? "text-ink" : "text-ink-faint"
                )}
              />
              <span
                className={cn(
                  "relative text-[10px] font-medium transition-colors",
                  isActive ? "text-ink" : "text-ink-faint"
                )}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
