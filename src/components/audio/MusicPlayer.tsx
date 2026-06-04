"use client";

import { useEffect, useRef } from "react";
import { useSettings, TRACKS } from "@/lib/settings";

/**
 * Background music. Mounts once (in the root layout) and follows the user's
 * settings: which track, whether music is on, and volume. Browsers block
 * autoplay until a user gesture, so playback starts on the first interaction.
 */
export function MusicPlayer() {
  const [settings] = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  // create the audio element once
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "none";
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  // react to settings
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const track = TRACKS.find((t) => t.id === settings.track) ?? TRACKS[0];
    const src = new URL(track.file, window.location.origin).toString();
    if (a.src !== src) a.src = src;
    a.volume = settings.volume;

    if (settings.musicOn && startedRef.current) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [settings.musicOn, settings.track, settings.volume]);

  // unlock audio + start on first user gesture
  useEffect(() => {
    const onGesture = () => {
      startedRef.current = true;
      const a = audioRef.current;
      if (a && settings.musicOn) a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, [settings.musicOn]);

  return null;
}
