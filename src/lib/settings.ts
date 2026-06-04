"use client";

import { useEffect, useState } from "react";

export interface GambitSettings {
  soundOn: boolean;
  musicOn: boolean;
  volume: number; // 0..1
  track: string; // current music track id
  name: string;
  avatar: string; // avatar id
}

export const DEFAULT_SETTINGS: GambitSettings = {
  soundOn: true,
  musicOn: false,
  volume: 0.5,
  track: "lofi",
  name: "",
  avatar: "violet",
};

const KEY = "gambit:settings";

export const AVATARS = ["violet", "teal", "amber", "rose", "sky", "lime"] as const;

// Royalty-free background tracks. Files live in /public/audio.
export const TRACKS = [
  { id: "lofi", label: "Lo-fi", file: "/audio/lofi.mp3" },
  { id: "arcade", label: "Arcade", file: "/audio/arcade.mp3" },
  { id: "ambient", label: "Ambient", file: "/audio/ambient.mp3" },
  { id: "synth", label: "Synthwave", file: "/audio/synth.mp3" },
] as const;

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
