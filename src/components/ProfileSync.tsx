"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import {
  fetchProfile,
  syncProgress,
  setProfile,
  setProfileLoading,
  clearProfile,
} from "@/lib/profile";
import { useProgress, hydrateProgress } from "@/lib/progress";
import { loadSettings, saveSettings } from "@/lib/settings";

/**
 * Mounts once in the root layout. On wallet connect it loads the saved profile
 * (remembering your name/photo/streak across devices) and keeps progression in
 * sync. No-ops cleanly when there's no wallet or Supabase isn't configured.
 */
export function ProfileSync() {
  const { address } = useAccount();
  const progress = useProgress();

  // load + hydrate on connect
  useEffect(() => {
    if (!address) {
      clearProfile();
      return;
    }
    let active = true;
    setProfileLoading(address);
    fetchProfile(address)
      .then((p) => {
        if (!active) return;
        setProfile(address, p);
        if (p) {
          const s = loadSettings();
          saveSettings({
            ...s,
            name: p.name || s.name,
            avatar: p.avatar || s.avatar,
            avatarImage: p.avatar_image || s.avatarImage,
          });
          hydrateProgress({
            xp: p.xp,
            streak: p.streak,
            lastPlayed: p.last_played ?? undefined,
            played: p.played,
            wins: p.wins,
          });
        }
      })
      .catch(() => active && setProfile(address, null));
    return () => {
      active = false;
    };
  }, [address]);

  // push progression (debounced) — only writes if a session token exists
  useEffect(() => {
    if (!address) return;
    const t = setTimeout(() => {
      syncProgress(address, {
        xp: progress.xp,
        streak: progress.streak,
        lastPlayed: progress.lastPlayed,
        played: progress.played,
        wins: progress.wins,
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [address, progress.xp, progress.streak, progress.played, progress.wins, progress.lastPlayed]);

  return null;
}
