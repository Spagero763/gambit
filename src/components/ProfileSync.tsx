"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import {
  fetchProfile,
  syncProgress,
  setProfile,
  setProfileLoading,
  clearProfile,
  createProfile,
  hasToken,
  useProfile,
} from "@/lib/profile";
import { useProgress, hydrateProgress } from "@/lib/progress";
import { loadSettings, saveSettings } from "@/lib/settings";
import { captureRef } from "@/lib/share";

/**
 * Best display name we can infer from a social sign-in, so email/Google/
 * Farcaster users get a real name on the leaderboard instead of their 0x, 
 * without typing anything. They can still change it in Settings.
 */
function suggestedName(user: any): string {
  const clean = (s?: string | null) => (s ?? "").trim().slice(0, 20);
  const fc = user?.farcaster;
  const cand =
    clean(user?.google?.name) ||
    clean(fc?.displayName) ||
    clean(fc?.username) ||
    clean(user?.twitter?.name) ||
    clean(user?.twitter?.username) ||
    clean(user?.discord?.username) ||
    clean(user?.email?.address ? String(user.email.address).split("@")[0] : "");
  return cand;
}

/**
 * Mounts once in the root layout. On wallet connect it loads the saved profile
 * (remembering your name/photo/streak across devices) and keeps progression in
 * sync. No-ops cleanly when there's no wallet or Supabase isn't configured.
 */
export function ProfileSync() {
  const { address } = useAccount();
  const { user } = usePrivy();
  const progress = useProgress();

  // remember who invited this visitor (?ref=0x…) until they sign up
  useEffect(() => {
    captureRef();
  }, []);

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
        const s = loadSettings();
        if (p) {
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
        } else if (!s.name) {
          // brand-new (often social) sign-in with no saved profile and no name
          // yet, seed a friendly default from their Google/Farcaster/email id
          const guess = suggestedName(user);
          if (guess) saveSettings({ ...s, name: guess });
        }
      })
      .catch(() => active && setProfile(address, null));
    return () => {
      active = false;
    };
    // `user` only feeds the name fallback; re-running on it is harmless (idempotent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, user]);

  // a session (usually from a first money match) is all it takes to put a
  // player who has no saved profile yet onto their account, no prompt
  const { profile, loading, address: loadedFor } = useProfile();
  const [session, setSession] = useState(0);
  const created = useRef<string | null>(null);
  useEffect(() => {
    const bump = () => setSession((n) => n + 1);
    window.addEventListener("gambit:session", bump);
    return () => window.removeEventListener("gambit:session", bump);
  }, []);
  useEffect(() => {
    if (!address || loading || profile || loadedFor !== address.toLowerCase() || !hasToken(address)) return;
    if (created.current === address) return;
    created.current = address;
    const s = loadSettings();
    createProfile(address, null, {
      name: s.name,
      avatar: s.avatar,
      avatarImage: s.avatarImage,
      xp: progress.xp,
      streak: progress.streak,
      lastPlayed: progress.lastPlayed,
      played: progress.played,
      wins: progress.wins,
    })
      .then((r) => setProfile(address, r.profile))
      .catch(() => {
        created.current = null;
      });
    // progress is read at the moment of creation, not tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, loading, profile, loadedFor, session]);

  // push progression (debounced), only writes if a session token exists
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
