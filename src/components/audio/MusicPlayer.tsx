"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { startMusic, stopMusic, setMusicVolume } from "@/lib/music";

/**
 * Background music driver. Mounts once in the root layout and follows the
 * user's settings. Music is generated live (see lib/music). Browsers block
 * audio until a user gesture, so playback starts on the first interaction.
 */
export function MusicPlayer() {
  const [settings] = useSettings();
  const started = useRef(false);

  // react to settings
  useEffect(() => {
    if (settings.musicOn && started.current) {
      startMusic(settings.track, settings.volume);
    } else {
      stopMusic();
    }
    setMusicVolume(settings.volume);
  }, [settings.musicOn, settings.track, settings.volume]);

  // unlock + start on first user gesture
  useEffect(() => {
    const onGesture = () => {
      started.current = true;
      if (settings.musicOn) startMusic(settings.track, settings.volume);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, [settings.musicOn, settings.track, settings.volume]);

  useEffect(() => () => stopMusic(), []);

  return null;
}
