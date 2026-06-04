"use client";

import { loadSettings } from "./settings";

/**
 * Tiny Web Audio sound effects, synthesized in-browser so there are no asset
 * files to ship. Respects the soundOn setting and the master volume.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

type Sfx = "tap" | "place" | "win" | "lose" | "deal" | "roll" | "clear";

const TONES: Record<Sfx, { freq: number; type: OscillatorType; dur: number; sweep?: number }> = {
  tap: { freq: 420, type: "sine", dur: 0.07 },
  place: { freq: 300, type: "triangle", dur: 0.09 },
  deal: { freq: 520, type: "square", dur: 0.05 },
  roll: { freq: 240, type: "sawtooth", dur: 0.14, sweep: 480 },
  clear: { freq: 660, type: "triangle", dur: 0.16, sweep: 990 },
  win: { freq: 523, type: "sine", dur: 0.5, sweep: 1046 },
  lose: { freq: 330, type: "sine", dur: 0.4, sweep: 160 },
};

export function play(sound: Sfx) {
  const s = loadSettings();
  if (!s.soundOn) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const { freq, type, dur, sweep } = TONES[sound];
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const vol = Math.min(0.25, s.volume * 0.3);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(sweep, ac.currentTime + dur);

  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);

  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}
