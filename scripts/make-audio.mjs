/* Generates the film's royalty-free-by-construction music bed:
   a slow ambient pad (Am7 → Fmaj7 → Cmaj7 → G6) with soft sub pulses,
   written as 16-bit stereo WAV. Fully synthesized here — no samples,
   no licensing surface. Output: video-assets/audio/bed.wav */
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const DUR = 106; // seconds — a hair past the film for the tail
const N = SR * DUR;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Chords as MIDI notes (low voicings, airy tops)
const CHORDS = [
  [45, 52, 57, 60, 64], // Am7
  [41, 48, 53, 57, 60], // Fmaj7
  [43, 48, 55, 59, 64], // Cmaj7/G
  [43, 50, 55, 59, 62], // G6
];
const BAR = 8; // seconds per chord — slow, cinematic

const out = new Float64Array(N * 2);

// ── pad ──────────────────────────────────────────────────────────
for (let ci = 0; ci * BAR < DUR; ci++) {
  const chord = CHORDS[ci % CHORDS.length];
  const t0 = ci * BAR;
  const t1 = Math.min(t0 + BAR, DUR);
  const s0 = Math.floor(t0 * SR);
  const s1 = Math.floor(t1 * SR);
  for (const m of chord) {
    const f = midi(m);
    const phase0 = Math.random() * Math.PI * 2; // free-running per voice
    const detune = 1 + (Math.random() - 0.5) * 0.0015;
    for (let s = s0; s < s1; s++) {
      const t = s / SR;
      const local = t - t0;
      // slow swell in/out within the bar (2.2s attack, 2.5s release)
      const env =
        Math.min(1, local / 2.2) *
        Math.min(1, (t1 - t0 - local) / 2.5 + 0.08);
      // two soft partials, high one rolled way off
      const v =
        Math.sin(2 * Math.PI * f * detune * t + phase0) * 0.62 +
        Math.sin(2 * Math.PI * f * 2 * detune * t + phase0 * 1.7) * 0.1;
      // gentle stereo motion per voice
      const panLfo = Math.sin(2 * Math.PI * 0.05 * t + m);
      const g = (env * v * 0.055) / chord.length;
      out[s * 2] += g * (1 - 0.35 * panLfo);
      out[s * 2 + 1] += g * (1 + 0.35 * panLfo);
    }
  }
}

// ── soft sub pulse (root, every half-bar) ────────────────────────
for (let ci = 0; ci * BAR < DUR; ci++) {
  const chord = CHORDS[ci % CHORDS.length];
  const rootF = midi(chord[0] - 12);
  for (let hit = 0; hit < 2; hit++) {
    const tHit = ci * BAR + hit * (BAR / 2);
    const sHit = Math.floor(tHit * SR);
    const len = Math.floor(2.6 * SR);
    for (let i = 0; i < len && sHit + i < N; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.5) * Math.exp(-t * 1.4);
      const v = Math.sin(2 * Math.PI * rootF * t) * env * 0.045;
      out[(sHit + i) * 2] += v;
      out[(sHit + i) * 2 + 1] += v;
    }
  }
}

// ── global fade in/out + clamp ───────────────────────────────────
for (let s = 0; s < N; s++) {
  const t = s / SR;
  const fade = Math.min(1, t / 3) * Math.min(1, (DUR - t) / 4);
  out[s * 2] *= fade;
  out[s * 2 + 1] *= fade;
}

const pcm = Buffer.alloc(N * 2 * 2);
for (let i = 0; i < N * 2; i++) {
  const v = Math.max(-1, Math.min(1, out[i]));
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(2, 22); // stereo
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

mkdirSync("video-assets/audio", { recursive: true });
writeFileSync("video-assets/audio/bed.wav", Buffer.concat([header, pcm]));
console.log("wrote video-assets/audio/bed.wav", ((44 + pcm.length) / 1e6).toFixed(1), "MB");
