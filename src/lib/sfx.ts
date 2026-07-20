"use client";

import { loadSettings } from "./settings";

/**
 * Web Audio sound design — synthesized in-browser, no asset files. Each effect
 * is layered (tone + noise transients with real envelopes and filters) so it
 * sounds tactile rather than like a single beep.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  peak?: number;
  when?: number;
  sweepTo?: number;
  filter?: number; // lowpass cutoff
  detune?: number;
}

function tone(o: ToneOpts) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (o.when ?? 0);
  const dur = o.dur ?? 0.14;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
  if (o.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.sweepTo), t0 + dur);

  let node: AudioNode = osc;
  if (o.filter) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(o.filter, t0);
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master);

  const peak = o.peak ?? 0.16;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

interface NoiseOpts {
  dur?: number;
  peak?: number;
  when?: number;
  filter?: number;
  sweepTo?: number;
  type?: BiquadFilterType;
}

function noise(o: NoiseOpts = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + (o.when ?? 0);
  const dur = o.dur ?? 0.08;
  const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = o.type ?? "lowpass";
  f.frequency.setValueAtTime(o.filter ?? 2400, t0);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.sweepTo), t0 + dur);
  f.Q.value = o.type === "bandpass" ? 1.2 : 0.7;
  const g = ac.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(o.peak ?? 0.16, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

type Sfx = "tap" | "place" | "win" | "lose" | "deal" | "roll" | "clear" | "capture" | "check";

// Haptics paired with each sound — the fifth feedback pillar (flash, shake,
// floating text, sound, particles… and touch). A tiny physical tick makes every
// move feel tactile on phones. Patterns in ms; iOS ignores vibrate() (no-op).
const HAPTIC: Record<Sfx, number | number[]> = {
  tap: 8,
  place: 12,
  capture: 25,
  check: 18,
  deal: 10,
  roll: [10, 30, 10],
  clear: 30,
  win: [30, 50, 30, 50, 80],
  lose: 60,
};

function buzz(sound: Sfx) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(HAPTIC[sound]);
  } catch {
    /* not supported — fine */
  }
}

export function play(sound: Sfx) {
  const s = loadSettings();
  if (!s.soundOn) return;
  const v = Math.min(1, Math.max(0, s.volume));
  if (v <= 0) return; // muted mutes the haptics too — one switch rules all
  buzz(sound);
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const V = (x: number) => x * v;

  switch (sound) {
    case "tap":
      tone({ freq: 660, type: "sine", dur: 0.05, peak: V(0.1) });
      break;

    case "place":
      // soft wooden click: a filtered noise tick over a low body thud
      noise({ dur: 0.045, peak: V(0.16), filter: 3600, sweepTo: 900 });
      tone({ freq: 190, type: "sine", dur: 0.13, peak: V(0.18), sweepTo: 120 });
      tone({ freq: 95, type: "triangle", dur: 0.12, peak: V(0.1), sweepTo: 70 });
      break;

    case "capture":
      // heavier knock — two pieces colliding
      noise({ dur: 0.07, peak: V(0.24), filter: 2600, sweepTo: 500 });
      tone({ freq: 150, type: "triangle", dur: 0.17, peak: V(0.22), sweepTo: 60 });
      tone({ freq: 320, type: "square", dur: 0.05, peak: V(0.08) });
      break;

    case "check":
      tone({ freq: 784, type: "sine", dur: 0.1, peak: V(0.14) });
      tone({ freq: 1175, type: "sine", dur: 0.16, peak: V(0.14), when: 0.08 });
      break;

    case "deal":
      // card flick / swish
      noise({ dur: 0.1, peak: V(0.18), filter: 1200, sweepTo: 6500, type: "bandpass" });
      break;

    case "roll":
      // dice rattle: a flurry of clicks, then it settles
      [0, 0.05, 0.1, 0.15, 0.2].forEach((w, i) =>
        noise({ dur: 0.035, peak: V(0.14), filter: 2200 + i * 350, when: w })
      );
      tone({ freq: 150, type: "sine", dur: 0.12, peak: V(0.12), when: 0.24, sweepTo: 110 });
      break;

    case "clear":
      // rising sparkle arpeggio
      [523, 659, 784, 1046].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.2, peak: V(0.13), when: i * 0.05, filter: 4000 })
      );
      break;

    case "win":
      // triumphant rising arpeggio, a warm bass to anchor it, then a final
      // major chord that rings out with a shimmer on top
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone({ freq: f, type: "sine", dur: 0.55, peak: V(0.16), when: i * 0.08 })
      );
      tone({ freq: 131, type: "triangle", dur: 0.6, peak: V(0.12), when: 0.32, sweepTo: 130 }); // bass root
      [523, 659, 784, 1046].forEach((f) =>
        tone({ freq: f, type: "sine", dur: 0.85, peak: V(0.11), when: 0.42 }) // sustained chord
      );
      [1318, 1568, 2093].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.45, peak: V(0.05), when: 0.5 + i * 0.05, filter: 6000 }) // sparkle
      );
      break;

    case "lose":
      // soft descending minor
      [392, 330, 262].forEach((f, i) =>
        tone({ freq: f, type: "sine", dur: 0.34, peak: V(0.15), when: i * 0.13, sweepTo: f * 0.94, filter: 1800 })
      );
      break;
  }
}
