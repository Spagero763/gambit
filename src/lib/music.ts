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
  motif: boolean; // melodic phrases on alternate bars
  crackle?: boolean; // vinyl warmth layer
}

// v3: real progressions (ii–V–I movement, vi–IV–I–V, natural-minor walks)
// instead of static color chords — the loop finally RESOLVES somewhere.
const STYLES: Record<Style, StyleDef> = {
  lofi: {
    bpm: 66,
    root: 50, // D — warm middle register
    wave: "triangle",
    prog: [[2, "min9"], [7, "dom7"], [0, "maj9"], [5, "maj7"]], // ii–V–I–IV
    arp: false,
    drums: true,
    pad: true,
    swing: 0.16,
    filter: 2200,
    verb: 0.38,
    motif: true,
    crackle: true,
  },
  ambient: {
    bpm: 50,
    root: 45,
    wave: "sine",
    prog: [[0, "maj9"], [7, "sus2"], [5, "maj9"], [10, "sus2"]],
    arp: false,
    drums: false,
    pad: true,
    swing: 0,
    filter: 1800,
    verb: 0.6,
    motif: true,
  },
  arcade: {
    bpm: 118,
    root: 48,
    wave: "triangle",
    prog: [[9, "min"], [5, "maj"], [0, "maj"], [7, "dom7"]], // vi–IV–I–V
    arp: true,
    drums: true,
    pad: false,
    swing: 0,
    filter: 4600,
    verb: 0.14,
    motif: false,
  },
  synth: {
    bpm: 92,
    root: 45,
    wave: "sawtooth",
    prog: [[0, "min9"], [8, "maj7"], [3, "maj7"], [10, "dom7"]], // i–VI–III–VII
    arp: true,
    drums: true,
    pad: true,
    swing: 0.05,
    filter: 2700,
    verb: 0.38,
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
let crackleSrc: AudioBufferSourceNode | null = null;
let crackleGain: GainNode | null = null;

// A 2-bar melodic PHRASE (per-eighth pentatonic degree or rest), regenerated
// every 4 bars and repeated — call-and-response instead of random notes.
let phrase: (number | null)[] = [];
let phraseBar = -1;
function makePhrase() {
  const RHYTHMS = [
    [1, 0, 1, 1, 0, 1, 0, 0],
    [0, 1, 1, 0, 1, 0, 1, 0],
    [1, 0, 0, 1, 1, 0, 1, 0],
  ];
  const r = RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)];
  let prev = Math.floor(Math.random() * PENTA.length);
  phrase = r.map((on) => {
    if (!on) return null;
    // melodies walk in steps more than they leap
    prev = Math.max(0, Math.min(PENTA.length - 1, prev + (Math.random() < 0.7 ? (Math.random() < 0.5 ? -1 : 1) : Math.floor(Math.random() * PENTA.length) - prev)));
    return prev;
  });
}

/** Sparse dust-and-pop loop — the warmth of a record player, nearly subliminal. */
function startCrackle() {
  if (!ctx || !master || crackleSrc) return;
  const secs = 2.8;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * 0.012; // dust floor
    if (Math.random() < 0.00012) d[i] = (Math.random() * 2 - 1) * 0.6; // pops
  }
  crackleSrc = ctx.createBufferSource();
  crackleSrc.buffer = buf;
  crackleSrc.loop = true;
  const lp2 = ctx.createBiquadFilter();
  lp2.type = "lowpass";
  lp2.frequency.value = 5200;
  crackleGain = ctx.createGain();
  crackleGain.gain.value = 0.9;
  crackleSrc.connect(lp2);
  lp2.connect(crackleGain);
  crackleGain.connect(master);
  crackleSrc.start();
}
function stopCrackle() {
  try {
    crackleSrc?.stop();
  } catch {
    /* already stopped */
  }
  crackleSrc = null;
  crackleGain = null;
}

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

  // drums: soft kick on 1 & 3 (occasional syncopation), rim backbeat on 2 & 4
  if (def.drums) {
    if (s === 0) kick(t, 0.17);
    if (s === 4) kick(t, 0.13);
    if (s === 5 && Math.random() < 0.25) kick(t, 0.09);
    if (s === 2 || s === 6) rim(t, 0.05);
    if (s % 2 === 1) hat(t, curStyle === "arcade" ? 0.04 : 0.014);
  }

  // arpeggio (eighths), cycling chord tones with octave lifts
  if (def.arp) {
    const tone = chord[(s + bar) % chord.length];
    const oct = s % 4 === 3 ? 24 : 12;
    voice(midi(root + tone + oct), t, eighth * 1.15, 0.05, def.wave, 4);
  }

  // melody: a cached 1-bar phrase repeated across alternate bars — coherent
  // call-and-response, regenerated every 4 bars so it evolves without chaos
  if (def.motif) {
    if (bar !== phraseBar && bar % 4 === 0 && s === 0) {
      makePhrase();
      phraseBar = bar;
    }
    if (bar % 2 === 1 && phrase[s] !== null && phrase[s] !== undefined) {
      const note = PENTA[phrase[s] as number];
      voice(midi(root + 12 + note), t, eighth * 1.7, 0.042, curStyle === "ambient" ? "sine" : "triangle", 3);
    }
  } else if (!def.arp && s % 2 === 0 && Math.random() < 0.3) {
    // sparse chord-tone sprinkles on the quiet bars
    const tone = chord[Math.floor(Math.random() * chord.length)];
    voice(midi(root + tone + 12), t, beat * 0.9, 0.028, def.wave, 5);
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
  if (STYLES[curStyle].crackle) startCrackle();
  else stopCrackle();
  if (playing) return; // already running; style/volume updated above
  playing = true;
  step = 0;
  bar = 0;
  phraseBar = -1;
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
  stopCrackle();
  if (ctx && master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
}

export function isMusicPlaying() {
  return playing;
}
