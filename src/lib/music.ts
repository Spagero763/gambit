"use client";

/**
 * Generative background music — composed live in the browser with Web Audio,
 * no asset files. Each "track" is a style (chord progression + tempo + timbre)
 * that loops forever with light variation, so it never sounds like a 4-second
 * loop on repeat.
 */

type Style = "lofi" | "arcade" | "ambient" | "synth";

const CHORDS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
};

interface StyleDef {
  bpm: number;
  root: number; // MIDI root
  wave: OscillatorType;
  prog: [number, keyof typeof CHORDS][]; // [scale-degree offset, chord]
  arp: boolean;
  hat: boolean;
  pad: boolean;
  filter: number; // master warmth cutoff
}

const STYLES: Record<Style, StyleDef> = {
  lofi: {
    bpm: 74,
    root: 48,
    wave: "sine",
    prog: [[0, "maj7"], [5, "maj7"], [9, "min7"], [7, "dom7"]],
    arp: false,
    hat: false,
    pad: true,
    filter: 2200,
  },
  ambient: {
    bpm: 54,
    root: 45,
    wave: "sine",
    prog: [[0, "maj9"], [7, "maj9"], [9, "min9"], [5, "maj9"]],
    arp: false,
    hat: false,
    pad: true,
    filter: 1800,
  },
  arcade: {
    bpm: 114,
    root: 48,
    wave: "triangle",
    prog: [[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"]],
    arp: true,
    hat: true,
    pad: false,
    filter: 4200,
  },
  synth: {
    bpm: 100,
    root: 45,
    wave: "sawtooth",
    prog: [[0, "min9"], [10, "maj7"], [8, "maj7"], [7, "dom7"]],
    arp: true,
    hat: false,
    pad: true,
    filter: 2600,
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lp: BiquadFilterNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let playing = false;
let curStyle: Style = "lofi";
let nextTime = 0;
let step = 0;
let bar = 0;
let vol = 0.5;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    master.connect(lp);
    lp.connect(ctx.destination);
  }
  return ctx;
}

function voice(freq: number, t: number, dur: number, peak: number, wave: OscillatorType, detune = 0) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  osc.connect(g);
  g.connect(master);
  const a = Math.min(0.25, dur * 0.25);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function hat(t: number, peak: number) {
  if (!ctx || !master) return;
  const dur = 0.05;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  src.connect(hp);
  hp.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function scheduleStep(s: number, t: number) {
  const def = STYLES[curStyle];
  const beat = 60 / def.bpm;
  const eighth = beat / 2;
  const [deg, chordName] = def.prog[bar % def.prog.length];
  const chord = CHORDS[chordName];
  const root = def.root + deg;

  // pad chord at the bar start, sustained for the whole bar
  if (s === 0) {
    if (def.pad) {
      chord.forEach((iv, i) =>
        voice(midi(root + iv), t, beat * 4 * 0.98, 0.05 - i * 0.004, def.wave, i % 2 ? 5 : -5)
      );
    }
    voice(midi(root - 12), t, beat * 1.6, 0.12, "triangle"); // bass
  }
  if (s === 4) voice(midi(root - 12 + (Math.random() < 0.4 ? 7 : 0)), t, beat * 1.4, 0.1, "triangle");

  // arpeggio (eighths), cycling chord tones up an octave with light randomness
  if (def.arp) {
    const tone = chord[(s + bar) % chord.length];
    const oct = s % 4 === 3 ? 24 : 12;
    voice(midi(root + tone + oct), t, eighth * 1.1, 0.06, def.wave);
  } else if (s % 2 === 0 && Math.random() < 0.5) {
    // sparse sprinkle for pad styles
    const tone = chord[Math.floor(Math.random() * chord.length)];
    voice(midi(root + tone + 12), t, beat * 0.9, 0.035, def.wave);
  }

  if (def.hat && s % 2 === 1) hat(t, 0.04);
}

function loop() {
  const ac = ensure();
  if (!ac || !playing) return;
  const def = STYLES[curStyle];
  const eighth = 60 / def.bpm / 2;
  while (nextTime < ac.currentTime + 0.3) {
    scheduleStep(step, nextTime);
    nextTime += eighth;
    step = (step + 1) % 8;
    if (step === 0) bar++;
  }
  timer = setTimeout(loop, 60);
}

export function startMusic(style: string, volume: number) {
  const ac = ensure();
  if (!ac || !master || !lp) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  curStyle = (style in STYLES ? style : "lofi") as Style;
  lp.frequency.setTargetAtTime(STYLES[curStyle].filter, ac.currentTime, 0.3);
  vol = volume;
  master.gain.setTargetAtTime(Math.min(0.6, volume * 0.5), ac.currentTime, 0.2);
  if (playing) return; // already running; style/volume updated above
  playing = true;
  step = 0;
  bar = 0;
  nextTime = ac.currentTime + 0.1;
  loop();
}

export function setMusicVolume(volume: number) {
  vol = volume;
  if (ctx && master) master.gain.setTargetAtTime(Math.min(0.6, volume * 0.5), ctx.currentTime, 0.2);
}

export function stopMusic() {
  playing = false;
  if (timer) clearTimeout(timer);
  timer = null;
  if (ctx && master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
}

export function isMusicPlaying() {
  return playing;
}
