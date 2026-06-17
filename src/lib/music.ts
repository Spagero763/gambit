"use client";

/**
 * Chiptune music engine — composed, not random. Each track is a real chord
 * progression (the catchy I–V–vi–IV family) driven by arpeggios, a bassline
 * and drums, plus a composed lead hook on the upbeat ones. NES/Game-Boy style:
 * energetic and memorable, generated live in the browser (no audio files).
 *
 * API kept identical to the old engine: startMusic / stopMusic / setMusicVolume.
 */

type Quality = "maj" | "min" | "dom7" | "sus4";
const CHORD: Record<Quality, number[]> = {
  maj: [0, 4, 7, 12],
  min: [0, 3, 7, 12],
  dom7: [0, 4, 7, 10],
  sus4: [0, 5, 7, 12],
};

interface TrackDef {
  bpm: number;
  arpWave: OscillatorType;
  leadWave: OscillatorType;
  arpDiv: number; // arp notes per beat (2 = eighths, 4 = sixteenths)
  prog: [number, Quality][]; // [root MIDI, quality] — one chord per bar
  /** composed lead hook over the whole progression, [MIDI|0 rest, beats] */
  lead?: [number, number][];
  swing?: number;
}

// MIDI helpers (C4 = 60)
const A = 57, B = 59, C = 60, D = 62, E = 64, F = 65, G = 67;
const up = (n: number) => n + 12;

const TRACKS: Record<string, TrackDef> = {
  // bright, bouncy — the default lobby energy. I–V–vi–IV in C.
  arcade: {
    bpm: 140,
    arpWave: "square",
    leadWave: "square",
    arpDiv: 4,
    prog: [
      [C, "maj"],
      [G, "maj"],
      [A, "min"],
      [F, "maj"],
    ],
    lead: [
      [up(G), 0.5], [up(E), 0.5], [up(C), 1], [up(D), 0.5], [up(E), 1.5],
      [up(D), 0.5], [up(B), 0.5], [up(G), 1], [up(A), 0.5], [up(B), 1.5],
      [up(C + 12), 0.5], [up(A), 0.5], [up(E), 1], [up(F), 0.5], [up(E), 1.5],
      [up(D), 0.5], [up(B), 0.5], [up(C), 1], [up(G), 0.5], [up(C), 1.5],
    ],
  },
  // synthwave / neon — minor, driving 16ths. vi–IV–I–V in A minor.
  neon: {
    bpm: 118,
    arpWave: "sawtooth",
    leadWave: "square",
    arpDiv: 4,
    prog: [
      [A, "min"],
      [F, "maj"],
      [C, "maj"],
      [G, "maj"],
    ],
    lead: [
      [up(A), 1], [up(C + 12), 0.5], [up(B), 0.5], [up(A), 1], [0, 1],
      [up(F), 1], [up(A), 0.5], [up(G), 0.5], [up(F), 1], [0, 1],
      [up(E), 1], [up(G), 0.5], [up(E), 0.5], [up(C), 1], [0, 1],
      [up(D), 1], [up(G), 0.5], [up(B), 0.5], [up(G), 1.5], [0, 0.5],
    ],
  },
  // funky bounce — syncopated, playful. C–Am–F–G7.
  bounce: {
    bpm: 126,
    arpWave: "square",
    leadWave: "triangle",
    arpDiv: 2,
    prog: [
      [C, "maj"],
      [A, "min"],
      [F, "maj"],
      [G, "dom7"],
    ],
  },
  // dreamy bright — gentler, sus colour. F–C–G–Am.
  dream: {
    bpm: 100,
    arpWave: "triangle",
    leadWave: "triangle",
    arpDiv: 2,
    prog: [
      [F, "sus4"],
      [C, "maj"],
      [G, "sus4"],
      [A, "min"],
    ],
    lead: [
      [up(C), 2], [up(E), 1], [up(F), 1], [up(E), 3], [0, 1],
      [up(G), 2], [up(E), 1], [up(C), 1], [up(D), 3], [0, 1],
    ],
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let playing = false;
let cur = "arcade";
let nextLoopAt = 0;
let vol = 0.5;

function makeImpulse(ac: AudioContext, secs: number, decay: number) {
  const len = Math.floor(ac.sampleRate * secs);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);

    bus = ctx.createGain();
    bus.connect(master);
    // light reverb for space
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(ctx, 1.4, 3);
    const send = ctx.createGain();
    send.gain.value = 0.18;
    bus.connect(send);
    send.connect(conv);
    conv.connect(master);
  }
  return ctx;
}

/** A chip voice: square/saw/tri with a punchy pluck envelope. */
function note(freq: number, t: number, dur: number, peak: number, wave: OscillatorType) {
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(peak * 0.6, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function kick(t: number) {
  if (!ctx || !bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + 0.22);
}

function noiseHit(t: number, dur: number, peak: number, hp: number) {
  if (!ctx || !bus) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** Schedule one full loop of the current track starting at absolute time t0. */
function scheduleLoop(t0: number) {
  const def = TRACKS[cur] ?? TRACKS.arcade;
  const beat = 60 / def.bpm;
  const bars = def.prog.length;
  const arpStep = beat / def.arpDiv;

  for (let b = 0; b < bars; b++) {
    const [root, qual] = def.prog[b];
    const tones = CHORD[qual];
    const barStart = t0 + b * 4 * beat;

    // bass: root on the downbeat + the fifth on beat 3 (drives the groove)
    note(midi(root - 12), barStart, beat * 1.6, 0.22, "triangle");
    note(midi(root - 12 + 7), barStart + 2 * beat, beat * 1.4, 0.18, "triangle");

    // arpeggio across the bar, climbing the chord tones
    const steps = def.arpDiv * 4;
    for (let s = 0; s < steps; s++) {
      const tone = tones[s % tones.length];
      const oct = Math.floor((s % (tones.length * 2)) / tones.length) * 12;
      const sw = def.swing && s % 2 === 1 ? arpStep * def.swing : 0;
      note(midi(root + tone + oct), barStart + s * arpStep + sw, arpStep * 1.05, 0.07, def.arpWave);
    }

    // drums: kick on 1 & 3, snare on 2 & 4, hats on every eighth
    kick(barStart);
    kick(barStart + 2 * beat);
    noiseHit(barStart + beat, 0.12, 0.16, 1800); // snare
    noiseHit(barStart + 3 * beat, 0.12, 0.16, 1800);
    for (let h = 0; h < 8; h++) noiseHit(barStart + h * (beat / 2), 0.03, h % 2 ? 0.05 : 0.03, 8000);
  }

  // composed lead hook on top
  if (def.lead) {
    let lt = t0;
    for (const [n, beats] of def.lead) {
      if (n > 0) note(midi(n), lt, beats * beat * 0.92, 0.1, def.leadWave);
      lt += beats * beat;
    }
  }

  return bars * 4 * beat; // loop duration
}

function loop() {
  const ac = ensure();
  if (!ac || !playing) return;
  while (nextLoopAt < ac.currentTime + 0.6) {
    const dur = scheduleLoop(nextLoopAt);
    nextLoopAt += dur;
  }
  timer = setTimeout(loop, 120);
}

export function startMusic(track: string, volume: number) {
  const ac = ensure();
  if (!ac || !master) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  cur = track in TRACKS ? track : "arcade";
  vol = volume;
  master.gain.setTargetAtTime(Math.min(0.5, volume * 0.42), ac.currentTime, 0.25);
  if (playing) return; // already running; track/volume updated above
  playing = true;
  nextLoopAt = ac.currentTime + 0.12;
  loop();
}

export function setMusicVolume(volume: number) {
  vol = volume;
  if (ctx && master) master.gain.setTargetAtTime(Math.min(0.5, volume * 0.42), ctx.currentTime, 0.25);
}

export function stopMusic() {
  playing = false;
  if (timer) clearTimeout(timer);
  timer = null;
  if (ctx && master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
}

export function isMusicPlaying() {
  return playing;
}
