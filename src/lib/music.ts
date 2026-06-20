"use client";

/**
 * Music = real audio files, one mood per game, looped with crossfades.
 *
 * Files live in /public/music/<key>.mp3 (see public/music/README.md for the
 * curated track list). A missing file is skipped silently — no errors, no
 * fallback beeps — so tracks can be added one at a time and the app never
 * breaks. Autoplay-blocked starts are retried on the first user gesture.
 */

export type MusicKey =
  | "lobby"
  | "chess"
  | "whot"
  | "tictactoe"
  | "snakes"
  | "blocks"
  | "tournament";

const SRC: Record<MusicKey, string> = {
  lobby: "/music/lobby.mp3",
  chess: "/music/chess.mp3",
  whot: "/music/whot.mp3",
  tictactoe: "/music/tictactoe.mp3",
  snakes: "/music/snakes.mp3",
  blocks: "/music/blocks.mp3",
  tournament: "/music/tournament.mp3",
};

let current: HTMLAudioElement | null = null;
let currentKey: MusicKey | null = null;
let vol = 0.5;
let wanted: MusicKey | null = null; // what we'd like to play once a gesture lands
let gestureHooked = false;

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Linear volume fade; resolves the element to `to` and runs onDone after. */
function fade(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const from = el.volume;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.volume = clamp(from + (to - from) * t);
    if (t < 1) requestAnimationFrame(tick);
    else onDone?.();
  };
  requestAnimationFrame(tick);
}

/** Some browsers block autoplay until the user interacts — retry then. */
function hookGesture() {
  if (gestureHooked || typeof window === "undefined") return;
  gestureHooked = true;
  const retry = () => {
    if (wanted) playMusic(wanted, vol);
  };
  window.addEventListener("pointerdown", retry, { once: true });
  window.addEventListener("keydown", retry, { once: true });
}

/** Start (or switch to) a track, crossfading from whatever's playing. */
export function playMusic(key: MusicKey, volume = vol) {
  if (typeof window === "undefined") return;
  vol = clamp(volume);
  wanted = key;

  // already on this track — just make sure the volume is right
  if (currentKey === key && current && !current.paused) {
    current.volume = vol;
    return;
  }

  // fade out and discard the old track
  const old = current;
  if (old) fade(old, 0, 400, () => old.pause());

  const el = new Audio(SRC[key]);
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  el.play()
    .then(() => fade(el, vol, 600))
    .catch(() => {
      // autoplay blocked or file missing — arm a gesture retry, stay silent
      hookGesture();
    });
  current = el;
  currentKey = key;
}

export function stopMusic() {
  wanted = null;
  const old = current;
  if (old) fade(old, 0, 300, () => old.pause());
  current = null;
  currentKey = null;
}

export function setMusicVolume(v: number) {
  vol = clamp(v);
  if (current) current.volume = vol;
}

export function isMusicPlaying() {
  return !!current && !current.paused;
}
