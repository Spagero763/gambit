"use client";

import { useEffect, useState } from "react";

export interface GambitSettings {
  soundOn: boolean;
  musicOn: boolean;
  volume: number; // 0..1
  name: string;
  avatar: string; // avatar colour id (fallback when no photo)
  avatarImage: string; // uploaded photo as a data URL ("" = none)
}

export const DEFAULT_SETTINGS: GambitSettings = {
  soundOn: true,
  musicOn: false, // off by default; one tap in Settings turns it on
  volume: 0.5,
  name: "",
  avatar: "teal",
  avatarImage: "",
};

const KEY = "gambit:settings";

export const AVATARS = ["teal", "violet", "amber", "rose", "sky", "lime"] as const;

// Solid avatar tints (matte, no gradients) shared by Profile + Settings.
export const AVATAR_HEX: Record<string, string> = {
  teal: "#3ecf8e",
  violet: "#8e8bf0",
  amber: "#e3b341",
  rose: "#e06c8b",
  sky: "#5fb7e6",
  lime: "#9bd154",
};

export function loadSettings(): GambitSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: GambitSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("gambit:settings", { detail: s }));
}

/** Reactive settings hook shared across the app via a storage event. */
export function useSettings(): [GambitSettings, (patch: Partial<GambitSettings>) => void] {
  const [settings, setSettings] = useState<GambitSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as GambitSettings | undefined;
      setSettings(detail ?? loadSettings());
    };
    window.addEventListener("gambit:settings", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gambit:settings", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = (patch: Partial<GambitSettings>) => {
    const next = { ...loadSettings(), ...patch };
    setSettings(next);
    saveSettings(next);
  };

  return [settings, update];
}
