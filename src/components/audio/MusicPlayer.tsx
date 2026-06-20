"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { playMusic, stopMusic, setMusicVolume, MusicKey } from "@/lib/music";

/**
 * Picks the right track for the screen you're on (each game has its own mood)
 * and follows the music toggle + volume live. The engine itself handles the
 * autoplay-gesture retry and crossfading between tracks.
 */
function keyForPath(path: string): MusicKey {
  if (path.startsWith("/play/")) {
    const slug = path.split("/")[2] ?? "";
    if (slug === "chess") return "chess";
    if (slug === "whot") return "whot";
    if (slug === "tic-tac-toe") return "tictactoe";
    if (slug === "snakes") return "snakes";
    if (slug === "blocks") return "blocks";
  }
  if (path.startsWith("/tournament")) return "tournament";
  return "lobby";
}

export function MusicPlayer() {
  const [s] = useSettings();
  const pathname = usePathname();

  useEffect(() => {
    if (!s.musicOn) {
      stopMusic();
      return;
    }
    playMusic(keyForPath(pathname || "/"), s.volume);
  }, [s.musicOn, pathname]);

  // live volume
  useEffect(() => {
    if (s.musicOn) setMusicVolume(s.volume);
  }, [s.volume, s.musicOn]);

  return null;
}
