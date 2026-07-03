"use client";

import dynamic from "next/dynamic";

// Below-the-fold home sections, split into their own chunks so the hero and
// game grid paint fast on low-end phones. Each hydrates after the shell.
export const LazyActiveGames = dynamic(() => import("@/components/ActiveGames").then((m) => m.ActiveGames), {
  ssr: false,
});
export const LazyDailyStrip = dynamic(() => import("@/components/Daily").then((m) => m.DailyStrip), {
  ssr: false,
});
export const LazyGameShowcase = dynamic(() => import("@/components/GameShowcase").then((m) => m.GameShowcase), {
  ssr: false,
});
export const LazySaveProgressPrompt = dynamic(
  () => import("@/components/SaveProgressPrompt").then((m) => m.SaveProgressPrompt),
  { ssr: false }
);
