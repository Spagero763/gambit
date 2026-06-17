"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { startMusic, stopMusic, setMusicVolume, isMusicPlaying } from "@/lib/music";

/**
 * Drives background chiptune from settings. Web Audio needs a user gesture to
 * start, so when music is enabled we arm a one-time "start on first tap" —
 * after that it follows the toggle, track and volume live.
 */
export function MusicPlayer() {
  const [s] = useSettings();
  const armed = useRef(false);

  useEffect(() => {
    if (!s.musicOn) {
      stopMusic();
      armed.current = false;
      return;
    }
    // try to start immediately (works if a gesture already happened)
    startMusic(s.track, s.volume);
    if (isMusicPlaying()) return;
    // otherwise start on the first interaction
    if (armed.current) return;
    armed.current = true;
    const go = () => {
      if (s.musicOn) startMusic(s.track, s.volume);
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, [s.musicOn, s.track]);

  // live volume
  useEffect(() => {
    if (s.musicOn) setMusicVolume(s.volume);
  }, [s.volume, s.musicOn]);

  return null;
}
