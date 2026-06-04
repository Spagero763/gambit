// Generates original, royalty-free looping background tracks as WAV files.
// Pure synthesis (no samples, no external assets), so we own them outright and
// they loop seamlessly. Run: node scripts/gen-music.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;

function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

// note helpers
const A4 = 440;
const note = (semisFromA4) => A4 * Math.pow(2, semisFromA4 / 12);
// scales (semitone offsets from A)
const minorPentatonic = [0, 3, 5, 7, 10];
const majorScale = [0, 2, 4, 5, 7, 9, 11];

function adsr(t, dur, a = 0.01, d = 0.1, s = 0.6, r = 0.2) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

// build one track: bars of chord pad + a gentle arpeggio, looped length = barCount*barSec
function buildTrack({ bars, barSec, root, scale, wave, bpmFeel, pad }) {
  const total = Math.floor(bars * barSec * SR);
  const out = new Float32Array(total);
  const scaleHz = scale.map((s) => note(root + s));

  // pad: slow sustained chord per bar
  for (let b = 0; b < bars; b++) {
    const start = Math.floor(b * barSec * SR);
    const len = Math.floor(barSec * SR);
    const chordRoot = scaleHz[(b * 2) % scaleHz.length] / 2; // an octave down
    const third = scaleHz[(b * 2 + 2) % scaleHz.length] / 2;
    const fifth = scaleHz[(b * 2 + 4) % scaleHz.length];
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.sin((Math.PI * i) / len); // smooth swell across the bar
      let v = 0;
      v += Math.sin(2 * Math.PI * chordRoot * t);
      v += 0.7 * Math.sin(2 * Math.PI * third * t);
      v += 0.5 * Math.sin(2 * Math.PI * fifth * t);
      out[start + i] += (v / 2.2) * env * pad;
    }
  }

  // arpeggio: notes per beat
  const beat = barSec / 4;
  const notesTotal = Math.floor((bars * barSec) / beat);
  for (let k = 0; k < notesTotal; k++) {
    const start = Math.floor(k * beat * SR);
    const dur = beat * 0.9;
    const len = Math.floor(dur * SR);
    const idx = (k * 3 + Math.floor(k / 4)) % scaleHz.length;
    const f = scaleHz[idx] * (k % 8 < 4 ? 1 : 2);
    for (let i = 0; i < len && start + i < total; i++) {
      const t = i / SR;
      const e = adsr(t, dur, 0.005, 0.08, 0.5, 0.15) * 0.22;
      let s;
      if (wave === "square") s = Math.sign(Math.sin(2 * Math.PI * f * t));
      else if (wave === "saw") s = 2 * ((f * t) % 1) - 1;
      else if (wave === "triangle") s = 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;
      else s = Math.sin(2 * Math.PI * f * t);
      out[start + i] += s * e * bpmFeel;
    }
  }

  // normalize + soft clip
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < total; i++) out[i] = Math.tanh(out[i] * g);
  return out;
}

const tracks = {
  lofi: { bars: 8, barSec: 2.0, root: -9, scale: minorPentatonic, wave: "sine", bpmFeel: 0.7, pad: 0.6 },
  arcade: { bars: 8, barSec: 1.4, root: 3, scale: majorScale, wave: "square", bpmFeel: 0.9, pad: 0.35 },
  ambient: { bars: 6, barSec: 3.0, root: -5, scale: majorScale, wave: "triangle", bpmFeel: 0.4, pad: 0.8 },
  synth: { bars: 8, barSec: 1.8, root: 0, scale: minorPentatonic, wave: "saw", bpmFeel: 0.8, pad: 0.5 },
};

mkdirSync("public/audio", { recursive: true });
for (const [name, cfg] of Object.entries(tracks)) {
  const samples = buildTrack(cfg);
  writeFileSync(`public/audio/${name}.wav`, writeWav(`public/audio/${name}.wav`, samples));
  console.log(`public/audio/${name}.wav  ${(samples.length / SR).toFixed(1)}s`);
}
