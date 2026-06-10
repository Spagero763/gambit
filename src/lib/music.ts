"use client";

/**
 * Generative background music — composed live with Web Audio, no asset files.
 * v2: real signal chain (lowpass → convolver reverb + filtered feedback delay),
 * drums (soft kick / rim), swing + humanized timing/velocity, detuned pads and
 * pentatonic motifs — so it sounds like music, not a test tone.
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
  sus2: [0, 2, 7],
};

interface StyleDef {
  bpm: number;
  root: number; // MIDI root
  wave: OscillatorType;
  prog: [number, keyof typeof CHORDS][];
  arp: boolean;
  drums: boolean;
  pad: boolean;
  swing: number; // 0..0.2 — push on off-eighths
  filter: number;
  verb: number; // reverb send 0..1
  motif: boolean; // pentatonic riffs on alternate bars
}

const STYLES: Record<Style, StyleDef> = {
  lofi: {
    bpm: 72,
    root: 48,
    wave: "triangle",
    prog: [[0, "maj9"], [9, "min9"], [5, "maj7"], [7, "dom7"]],
    arp: false,
    drums: true,
    pad: true,
    swing: 0.14,
    filter: 2400,
    verb: 0.3,
    motif: true,
  },
  ambient: {
    bpm: 52,
    root: 45,
    wave: "sine",
    prog: [[0, "maj9"], [7, "sus2"], [9, "min9"], [5, "maj9"]],
    arp: false,
    drums: false,
    pad: true,
    swing: 0,
    filter: 1900,
    verb: 0.55,
    motif: true,
  },
  arcade: {
    bpm: 116,
    root: 48,
    wave: "triangle",
    prog: [[0, "maj"], [9, "min"], [5, "maj"], [7, "dom7"]],
    arp: true,
    drums: true,
    pad: false,
    swing: 0,
    filter: 4600,
    verb: 0.16,
    motif: false,
  },
  synth: {
    bpm: 96,
    root: 45,
    wave: "sawtooth",
    prog: [[0, "min9"], [10, "maj7"], [8, "maj7"], [5, "min7"]],
    arp: true,
    drums: true,
    pad: true,
    swing: 0.06,
    filter: 2800,
    verb: 0.35,
    motif: true,
  },
};

const PENTA = [0, 3, 5, 7, 10]; // minor pentatonic — always sounds right

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const hum = (amt: number) => 1 + (Math.random() * 2 - 1) * amt; // humanize ×(1±amt)

let ctx: AudioContext | null = null;
let bus: GainNode | null = null; // all voices in
let master: GainNode | null = null;
let lp: BiquadFilterNode | null = null;
let verbSend: GainNode | null = null;
let dlySend: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let playing = false;
let curStyle: Style = "lofi";
let nextTime = 0;
let step = 0;
let bar = 0;

/** Exponentially decaying noise impulse — a perfectly good room, for free. */
function makeImpulse(ac: AudioContext, seconds: number, decay: number) {
  const rate = ac.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ac.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
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
    master.connect(ctx.destination);

    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    lp.connect(master);

    bus = ctx.createGain();
    bus.connect(lp);

    // reverb: bus → convolver → master
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.6, 3.2);
    verbSend = ctx.createGain();
    verbSend.gain.value = 0.3;
    bus.connect(verbSend);
    verbSend.connect(convolver);
    convolver.connect(master);

    // delay: bus → delay (filtered feedback) → master, quiet echo for space
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.31;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const fbFilter = ctx.createBiquadFilter();
    fbFilter.type = "lowpass";
    fbFilter.frequency.value = 1600;
    delay.connect(fbFilter);
    fbFilter.connect(fb);
    fb.connect(delay);
    dlySend = ctx.createGain();
    dlySend.gain.value = 0.16;
    bus.connect(dlySend);
    dlySend.connect(delay);
    const dlyOut = ctx.createGain();
    dlyOut.gain.value = 0.5;
    delay.connect(dlyOut);
    dlyOut.connect(master);
  }
  return ctx;
}

/** A musical voice: two slightly detuned oscillators through a soft envelope. */
function voice(freq: number, t: number, dur: number, peak: number, wave: OscillatorType, spread = 6) {
  if (!ctx || !bus) return;
  const g = ctx.createGain();
  g.connect(bus);
  const p = peak * hum(0.18);
  const a = Math.min(0.3, dur * 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, p), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const det of [-spread, spread]) {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = det;
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

/** Soft kick: a sine that drops from 110→45Hz with a fast envelope. */
function kick(t: number, peak: number) {
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g);
  g.connect(bus);
  osc.start(t);
  osc.stop(t + 0.22);
}

/** Lo-fi rim/snare: a bandpassed noise tick. */
function rim(t: number, peak: number) {
  if (!ctx || !bus) return;
  const dur = 0.08;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1900;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  src.connect(bp);
  bp.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function hat(t: number, peak: number) {
  if (!ctx || !bus) return;
  const dur = 0.045;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7500;
  const g = ctx.createGain();
  src.connect(hp);
  hp.connect(g);
  g.connect(bus);
  g.gain.setValueAtTime(peak * hum(0.3), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function scheduleStep(s: number, tBase: number) {
  const def = STYLES[curStyle];
  const beat = 60 / def.bpm;
  const eighth = beat / 2;
  // swing pushes the off-eighths late; ±6ms humanization on everything
  const t = tBase + (s % 2 === 1 ? eighth * def.swing : 0) + (Math.random() * 2 - 1) * 0.006;
  const [deg, chordName] = def.prog[bar % def.prog.length];
  const chord = CHORDS[chordName];
  const root = def.root + deg;

  // pad chord at the bar start, sustained for the whole bar
  if (s === 0) {
    if (def.pad) {
      chord.forEach((iv, i) =>
        voice(midi(root + iv), t, beat * 4 * 0.98, 0.045 - i * 0.0035, def.wave, 7)
      );
    }
    voice(midi(root - 12), t, beat * 1.7, 0.13, "triangle", 2); // bass
  }
  if (s === 4) voice(midi(root - 12 + (Math.random() < 0.4 ? 7 : 0)), t, beat * 1.4, 0.1, "triangle", 2);
  if (s === 7 && Math.random() < 0.35) voice(midi(root - 5), t, eighth, 0.07, "triangle", 2); // pickup

  // drums: kick on 1 & 3 (with occasional syncopation), rim backbeat on 2 & 4
  if (def.drums) {
    if (s === 0) kick(t, 0.22);
    if (s === 4) kick(t, 0.18);
    if (s === 5 && Math.random() < 0.3) kick(t, 0.12);
    if (s === 2 || s === 6) rim(t, 0.07);
    if (s % 2 === 1) hat(t, curStyle === "arcade" ? 0.045 : 0.02);
  }

  // arpeggio (eighths), cycling chord tones with octave lifts
  if (def.arp) {
    const tone = chord[(s + bar) % chord.length];
    const oct = s % 4 === 3 ? 24 : 12;
    voice(midi(root + tone + oct), t, eighth * 1.15, 0.055, def.wave, 4);
  }

  // pentatonic motif on alternate bars — a real melodic phrase, not noise
  if (def.motif && bar % 2 === 1 && (s === 1 || s === 3 || s === 4 || s === 6)) {
    if (Math.random() < 0.75) {
      const note = PENTA[Math.floor(Math.random() * PENTA.length)];
      voice(midi(root + 12 + note), t, eighth * 1.6, 0.045, curStyle === "ambient" ? "sine" : "triangle", 3);
    }
  } else if (!def.arp && s % 2 === 0 && Math.random() < 0.35) {
    // sparse chord-tone sprinkles on the quiet bars
    const tone = chord[Math.floor(Math.random() * chord.length)];
    voice(midi(root + tone + 12), t, beat * 0.9, 0.03, def.wave, 5);
  }
}

function loop() {
  const ac = ensure();
  if (!ac || !playing) return;
  const def = STYLES[curStyle];
  const eighth = 60 / def.bpm / 2;
  while (nextTime < ac.currentTime + 0.35) {
    scheduleStep(step, nextTime);
    nextTime += eighth;
    step = (step + 1) % 8;
    if (step === 0) bar++;
  }
  timer = setTimeout(loop, 60);
}

export function startMusic(style: string, volume: number) {
  const ac = ensure();
  if (!ac || !master || !lp || !verbSend) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  curStyle = (style in STYLES ? style : "lofi") as Style;
  lp.frequency.setTargetAtTime(STYLES[curStyle].filter, ac.currentTime, 0.3);
  verbSend.gain.setTargetAtTime(STYLES[curStyle].verb, ac.currentTime, 0.3);
  master.gain.setTargetAtTime(Math.min(0.6, volume * 0.5), ac.currentTime, 0.2);
  if (playing) return; // already running; style/volume updated above
  playing = true;
  step = 0;
  bar = 0;
  nextTime = ac.currentTime + 0.1;
  loop();
}

export function setMusicVolume(volume: number) {
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
