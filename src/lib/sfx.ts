"use client";

import { loadSettings } from "./settings";

/**
 * Web Audio sound design — synthesized in-browser, no asset files, produced
 * like a track rather than beeped like a form:
 *
 *   voices → stereo pan → master gain → compressor → speakers
 *                └── send → convolver reverb ─┘
 *
 * - SPATIAL: every voice can pan, and the games pass WHERE the action happened,
 *   so a piece dropped on the left of the board sounds from the left.
 * - SPACE: a procedurally generated impulse response gives sounds a real room
 *   to ring in (wins bloom, losses sigh) — still zero downloaded bytes.
 * - BASS: a dedicated sub layer (40–60Hz sine thumps) under impacts, felt more
 *   than heard on phones with any bass response.
 * - GLUE: a mastering compressor keeps it loud, warm and clip-free.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let verb: ConvolverNode | null = null;

/** A small hall, generated: decaying stereo noise as the impulse response. */
function impulse(ac: AudioContext, seconds = 1.4, decay = 2.8): AudioBuffer {
  const rate = ac.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    // mastering chain: master → compressor → out
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

    // reverb bus (also through the compressor so the tail sits in the mix)
    try {
      verb = ctx.createConvolver();
      verb.buffer = impulse(ctx);
      verb.connect(master);
    } catch {
      verb = null; // ancient webview — everything still plays dry
    }
  }
  return ctx;
}

const clampPan = (p: number) => Math.max(-1, Math.min(1, p));

/** Route a voice: optional stereo pan, dry to master, a send to the reverb. */
function out(ac: AudioContext, g: GainNode, t0: number, pan?: number, space = 0.1) {
  let node: AudioNode = g;
  if (pan && (ac as any).createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.setValueAtTime(clampPan(pan), t0);
    g.connect(p);
    node = p;
  }
  node.connect(master!);
  if (verb && space > 0) {
    const send = ac.createGain();
    send.gain.value = space;
    node.connect(send);
    send.connect(verb);
  }
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
  pan?: number; // -1 (left) … 1 (right)
  space?: number; // reverb send 0..~0.5
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
  out(ac, g, t0, o.pan, o.space ?? 0.1);

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
  pan?: number;
  space?: number;
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
  out(ac, g, t0, o.pan, o.space ?? 0.08);
  g.gain.setValueAtTime(o.peak ?? 0.16, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** The bass you feel: a sub thump with a quick pitch drop. Always dry. */
function sub(o: { when?: number; peak?: number; freq?: number; dur?: number } = {}) {
  tone({
    freq: o.freq ?? 55,
    type: "sine",
    dur: o.dur ?? 0.26,
    peak: o.peak ?? 0.22,
    when: o.when,
    sweepTo: 36,
    space: 0,
  });
}

type Sfx = "tap" | "place" | "win" | "lose" | "deal" | "roll" | "clear" | "capture" | "check";

/** Where the action happened, so the sound comes from there. */
export interface PlayOpts {
  /** -1 left … 1 right (e.g. board column mapped across the stereo field) */
  pan?: number;
  /** frequency multiplier — combos pitch up (1 = normal, 1.12 = brighter) */
  pitch?: number;
}

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

export function play(sound: Sfx, opts: PlayOpts = {}) {
  const s = loadSettings();
  if (!s.soundOn) return;
  const v = Math.min(1, Math.max(0, s.volume));
  if (v <= 0) return; // muted mutes the haptics too — one switch rules all
  buzz(sound);
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const V = (x: number) => x * v;
  const pan = opts.pan ?? 0;
  const P = (f: number) => f * (opts.pitch ?? 1);

  switch (sound) {
    case "tap":
      tone({ freq: 660, type: "sine", dur: 0.05, peak: V(0.1), pan });
      break;

    case "place":
      // soft wooden click: a filtered noise tick over a low body thud
      noise({ dur: 0.045, peak: V(0.16), filter: 3600, sweepTo: 900, pan });
      tone({ freq: 190, type: "sine", dur: 0.13, peak: V(0.18), sweepTo: 120, pan });
      tone({ freq: 95, type: "triangle", dur: 0.12, peak: V(0.1), sweepTo: 70, pan });
      break;

    case "capture":
      // heavier knock — two pieces colliding, with real weight under it
      noise({ dur: 0.07, peak: V(0.24), filter: 2600, sweepTo: 500, pan });
      tone({ freq: 150, type: "triangle", dur: 0.17, peak: V(0.22), sweepTo: 60, pan });
      tone({ freq: 320, type: "square", dur: 0.05, peak: V(0.08), pan });
      sub({ peak: V(0.2) });
      break;

    case "check":
      // an alarm that rings in the room — danger should feel spacious
      tone({ freq: 784, type: "sine", dur: 0.1, peak: V(0.14), pan, space: 0.22 });
      tone({ freq: 1175, type: "sine", dur: 0.16, peak: V(0.14), when: 0.08, pan, space: 0.28 });
      break;

    case "deal":
      // card flick / swish
      noise({ dur: 0.1, peak: V(0.18), filter: 1200, sweepTo: 6500, type: "bandpass", pan });
      break;

    case "roll":
      // dice rattle bouncing across the stereo field, then it settles heavy
      [0, 0.05, 0.1, 0.15, 0.2].forEach((w, i) =>
        noise({ dur: 0.035, peak: V(0.14), filter: 2200 + i * 350, when: w, pan: (i % 2 ? 0.5 : -0.5) * (1 - i / 6) })
      );
      tone({ freq: 150, type: "sine", dur: 0.12, peak: V(0.12), when: 0.24, sweepTo: 110 });
      sub({ when: 0.24, peak: V(0.14), freq: 60 });
      break;

    case "clear":
      // rising sparkle arpeggio — combos pitch it up, and it blooms in the room
      [523, 659, 784, 1046].forEach((f, i) =>
        tone({ freq: P(f), type: "triangle", dur: 0.2, peak: V(0.13), when: i * 0.05, filter: 4000, pan, space: 0.2 })
      );
      sub({ peak: V(0.16), freq: 58 });
      break;

    case "win":
      // triumphant rise, a chest-deep drop under it, then a chord that blooms
      // in the hall with shimmer on top — a produced moment, not a beep
      sub({ peak: V(0.26), freq: 65, dur: 0.5 });
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone({ freq: f, type: "sine", dur: 0.55, peak: V(0.16), when: i * 0.08, space: 0.16 })
      );
      tone({ freq: 131, type: "triangle", dur: 0.6, peak: V(0.12), when: 0.32, sweepTo: 130 }); // bass root
      sub({ when: 0.32, peak: V(0.2), freq: 52, dur: 0.6 });
      [523, 659, 784, 1046].forEach((f) =>
        tone({ freq: f, type: "sine", dur: 0.85, peak: V(0.11), when: 0.42, space: 0.3 }) // sustained chord, in the room
      );
      [1318, 1568, 2093].forEach((f, i) =>
        tone({ freq: f, type: "triangle", dur: 0.45, peak: V(0.05), when: 0.5 + i * 0.05, filter: 6000, space: 0.35 }) // sparkle
      );
      break;

    case "lose":
      // soft descending minor with a low sigh — it should ache a little
      sub({ peak: V(0.14), freq: 48, dur: 0.5 });
      [392, 330, 262].forEach((f, i) =>
        tone({ freq: f, type: "sine", dur: 0.34, peak: V(0.15), when: i * 0.13, sweepTo: f * 0.94, filter: 1800, space: 0.25 })
      );
      break;
  }
}
