"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Global extras that no page needs for its first paint: music, the home tour,
// achievement toasts and the background profile sync. Loaded as separate
// chunks AFTER the page is interactive, so they stop taxing first load on
// low-end phones (they were hydrating on every route).
const MusicPlayer = dynamic(() => import("@/components/audio/MusicPlayer").then((m) => m.MusicPlayer), { ssr: false });
const Tour = dynamic(() => import("@/components/Tour").then((m) => m.Tour), { ssr: false });
const AchievementToast = dynamic(() => import("@/components/Achievements").then((m) => m.AchievementToast), { ssr: false });
const RankUpCelebration = dynamic(() => import("@/components/RankUpCelebration").then((m) => m.RankUpCelebration), { ssr: false });
const ProfileSync = dynamic(() => import("@/components/ProfileSync").then((m) => m.ProfileSync), { ssr: false });
const ChatBubble = dynamic(() => import("@/components/ChatBubble").then((m) => m.ChatBubble), { ssr: false });

export function LayoutExtras() {
  // mount after the browser has a quiet moment (or 1.2s, whichever first)
  const [go, setGo] = useState(false);
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setGo(true), { timeout: 1200 });
    else setTimeout(() => setGo(true), 800);
  }, []);
  if (!go) return null;

  return (
    <>
      <ProfileSync />
      <AchievementToast />
      <RankUpCelebration />
      <MusicPlayer />
      <Tour />
      <ChatBubble />
    </>
  );
}
