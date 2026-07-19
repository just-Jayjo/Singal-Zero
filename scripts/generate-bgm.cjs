const fs = require('fs');
const path = require('path');

const SR = 44100;
const BPM = 95;
const STEP = (60 / BPM / 2);
const BEATS_PER_CYCLE = 16;
const CYCLES = 16;
const TOTAL_SEC = STEP * BEATS_PER_CYCLE * CYCLES;
const TOTAL_SAMPLES = Math.floor(SR * TOTAL_SEC);
const OUT_DIR = path.join(__dirname, '..', 'public', 'audio');

const CHORDS = [
  [92.50, 110.00, 138.59, 185.00],
  [138.59, 185.00, 220.00, 277.18],
  [110.00, 138.59, 185.00, 220.00],
  [123.47, 155.56, 185.00, 246.94],
];
const CHORDS_BOSS = [
  [92.50, 110.00, 138.59, 185.00],
  [123.47, 155.56, 185.00, 246.94],
  [92.50, 110.00, 138.59, 185.00],
  [138.59, 185.00, 220.00, 277.18],
];
const LEAD_MELODY = [369.99, 440.0, 554.37, 369.99, 329.63, 440.0];
const LEAD_MELODY2 = [440.0, 554.37, 659.25, 493.88, 440.0, 554.37];
const BOSS_LEAD = [369.99, 440.0, 277.18, 329.63, 440.0, 554.37, 493.88, 369.99];

function writeWAV(filename, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filename, buffer);
  console.log(`Wrote ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}

function oscSine(t, freq) {
  return Math.sin(2 * Math.PI * freq * t);
}
function oscSaw(t, freq) {
  return 2 * ((freq * t) % 1) - 1;
}
function oscSquare(t, freq) {
  return ((freq * t) % 1) < 0.5 ? 1 : -1;
}
function oscTri(t, freq) {
  const p = (freq * t) % 1;
  return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
}

let _noisePhase = 0;
function noise() {
  _noisePhase = (_noisePhase + 1) % 65536;
  return (_noisePhase * 12345 + 1103515245) / 2147483648 - 1;
}

function lowpass(state, input, cutoff) {
  const c = Math.min(1, cutoff / SR);
  return state + c * (input - state);
}

function bandpass(x1, x2, input, freq, q) {
  const w0 = 2 * Math.PI * freq / SR;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  return (b0 / a0) * input - (a1 / a0) * x1 - (a2 / a0) * x2;
}

function generateBGM(isBoss) {
  _noisePhase = Math.floor(Math.random() * 65536);
  const out = new Float32Array(TOTAL_SAMPLES);
  const bpm = isBoss ? 105 : BPM;
  const step = 60 / bpm / 2;
  const totalBeats = BEATS_PER_CYCLE * CYCLES;
  const chords = isBoss ? CHORDS_BOSS : CHORDS;

  let lpState = 0, bp_x1 = 0, bp_x2 = 0;

  for (let beat = 0; beat < totalBeats; beat++) {
    const b = beat % BEATS_PER_CYCLE;
    const bar = Math.floor(beat / BEATS_PER_CYCLE);
    const chordIdx = bar % chords.length;
    const c = chords[chordIdx];
    const beatSec = beat * step;

    /* Section: 0=minimal, 1=build, 2=full, 3=fuller */
    const section = bar < 2 ? 0 : bar < 5 ? 1 : bar < 11 ? 2 : 3;

    /* ── Kick on every downbeat (same volume throughout) ── */
    if (b % 4 === 0) {
      for (let i = 0; i < Math.floor(SR * 0.35); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += oscSine(t, 150 * Math.exp(-t * 12)) * Math.exp(-t * 10) * 0.7;
        if (t < 0.003) out[idx] += noise() * 0.5 * (1 - t / 0.003);
      }
    }
    /* extra kick on beat 2 (full sections) */
    if (section >= 2 && b % 4 === 2) {
      for (let i = 0; i < Math.floor(SR * 0.3); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += oscSine(t, 120 * Math.exp(-t * 14)) * Math.exp(-t * 12) * 0.5;
      }
    }

    /* ── Snare on beat 2 ── */
    if (b % 4 === 2) {
      for (let i = 0; i < Math.floor(SR * 0.1); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += noise() * Math.exp(-t * 30) * 0.35;
        out[idx] += oscSine(t, 220 - t * 500) * Math.exp(-t * 40) * 0.15;
      }
    }
    /* extra snare (full sections) */
    if (section >= 2 && (b === 7 || b === 15)) {
      for (let i = 0; i < Math.floor(SR * 0.08); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += noise() * Math.exp(-t * 35) * 0.2;
      }
    }

    /* ── Hi-hat ── */
    if (b % 2 === 1) {
      for (let i = 0; i < Math.floor(SR * 0.035); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += noise() * Math.exp(-t * 80) * 0.15;
      }
    }
    if (section >= 2) {
      if (b % 4 === 0) {
        for (let i = 0; i < Math.floor(SR * 0.025); i++) {
          const t = i / SR;
          const idx = Math.floor(SR * (beatSec + t * 0.5));
          if (idx >= TOTAL_SAMPLES) break;
          out[idx] += noise() * Math.exp(-t * 100) * 0.08;
        }
      }
    }

    /* ── Cowbell (all sections, same volume) ── */
    if (b === 2 || b === 6 || b === 10 || b === 14) {
      for (let i = 0; i < Math.floor(SR * 0.04); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        const n = noise() * Math.exp(-t * 40) * 0.15;
        const bpOut = bandpass(bp_x1, bp_x2, n, 900, 3);
        bp_x2 = bp_x1; bp_x1 = bpOut;
        out[idx] += bpOut * 0.6;
      }
    }

    /* ── Pad (consistent volume from start) ── */
    for (let i = 0; i < Math.floor(SR * step); i++) {
      const t = i / SR;
      const idx = Math.floor(SR * beatSec) + i;
      if (idx >= TOTAL_SAMPLES) break;
      let pad = 0;
      pad += oscSaw(t + beatSec, c[0] * 0.5) * 0.10;
      pad += oscSaw(t + beatSec, c[0]) * 0.08;
      pad += oscSaw(t + beatSec, c[0] * 2) * 0.07;
      pad += oscTri(t + beatSec, c[0] * 3) * 0.06;
      lpState = lowpass(lpState, pad, 400);
      out[idx] += lpState * 0.3;
    }

    /* ── Bass slide on downbeat (section >= 1) ── */
    if (b % 4 === 0 && section >= 1) {
      for (let i = 0; i < Math.floor(SR * 0.3); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        const freq = c[0] * (1 + 0.04 * Math.sin(t * 8)) * (1 - t * 0.08);
        const lpBass = lowpass(0, oscSaw(t, freq), 400 * Math.exp(-t * 10));
        out[idx] += lpBass * Math.exp(-t * 8) * 0.35;
      }
    }

    /* ── Sub-bass (section >= 1) ── */
    if (section >= 1) {
      for (let i = 0; i < Math.floor(SR * step); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += oscSine(t + beatSec, c[0] / 2) * 0.35;
      }
    }

    /* ── Lead melody (section >= 1, snappy short notes) ── */
    if (b === 0 && section >= 1) {
      const spacing = isBoss ? 0.28 : 0.38;
      const mel = isBoss ? BOSS_LEAD : (section >= 3 ? LEAD_MELODY2 : LEAD_MELODY);
      const gain = isBoss ? 0.08 : 0.10;
      for (let ni = 0; ni < mel.length; ni++) {
        const noteStart = beatSec + ni * spacing;
        for (let i = 0; i < Math.floor(SR * 0.35); i++) {
          const t = i / SR;
          const idx = Math.floor(SR * noteStart) + i;
          if (idx >= TOTAL_SAMPLES) break;
          const vibrato = isBoss ? 0 : Math.sin(2 * Math.PI * 7 * t) * 4;
          const freq = mel[ni] + vibrato;
          const wave = isBoss ? oscSquare(t, freq) : oscTri(t, freq);
          out[idx] += wave * Math.exp(-t * (isBoss ? 10 : 8)) * gain;
        }
      }
    }

    /* ── Arp on beat 8 (section >= 2) ── */
    if (b === 8 && section >= 2) {
      const notes = [c[0], c[2], c[1], c[3]];
      for (let ni = 0; ni < 4; ni++) {
        const noteStart = beatSec + ni * 0.2;
        for (let i = 0; i < Math.floor(SR * 0.2); i++) {
          const t = i / SR;
          const idx = Math.floor(SR * noteStart) + i;
          if (idx >= TOTAL_SAMPLES) break;
          out[idx] += oscSquare(t, notes[ni]) * Math.exp(-t * 10) * 0.10;
        }
      }
    }

    /* ── Pad harmony third (section >= 3) ── */
    if (section >= 3) {
      for (let i = 0; i < Math.floor(SR * step); i++) {
        const t = i / SR;
        const idx = Math.floor(SR * beatSec) + i;
        if (idx >= TOTAL_SAMPLES) break;
        out[idx] += oscSine(t + beatSec, c[1]) * 0.06;
      }
    }
  }

  /* Master gain boost (2x) */
  for (let i = 0; i < out.length; i++) {
    out[i] *= 2.0;
  }

  /* Normalize to just under 0dB */
  let max = 0;
  for (let i = 0; i < out.length; i++) {
    const v = Math.abs(out[i]);
    if (v > max) max = v;
  }
  if (max > 0.98) {
    const scale = 0.98 / max;
    for (let i = 0; i < out.length; i++) out[i] *= scale;
    console.log(`Normalized by ${scale.toFixed(3)}`);
  }

  return out;
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Generating normal BGM...');
const normal = generateBGM(false);
writeWAV(path.join(OUT_DIR, 'bgm_normal.wav'), normal);

console.log('Generating boss BGM...');
const boss = generateBGM(true);
writeWAV(path.join(OUT_DIR, 'bgm_boss.wav'), boss);

console.log('Done.');
