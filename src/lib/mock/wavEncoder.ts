// Speech-like placeholder voice, so lip-sync can be tested before the real VITS model exists.
// A buzzing "voice" at the requested pitch passes through three formant filters chosen from each
// letter's vowel; consonants add closures, bursts and hiss; spaces become pauses.
import type { Prosody } from "@/lib/api/contracts";
import { createRng } from "./seeded";
import { describeChar, type Manner, type VowelQuality } from "./tamilText";

export interface SpeechPlan {
  symbols: string[];
  /** Frames per symbol, as predicted by the (mock) duration predictor. */
  durations: number[];
  hopSamples: number;
  sampleRate: number;
  prosody: Prosody;
  /** Speaker vocal-tract size: above 1 raises all formants a little. */
  formantScale: number;
  /** 0–1: a small pitch shake (used for fear). */
  tremor: number;
  /** Rising pitch at the end, for questions. */
  question: boolean;
  seed: number;
}

type Formants = readonly [number, number, number];

const VOWEL_FORMANTS: Record<VowelQuality, Formants> = {
  a: [760, 1300, 2550],
  i: [310, 2250, 2950],
  u: [340, 880, 2350],
  e: [480, 1950, 2600],
  o: [520, 920, 2450],
  ai: [760, 1300, 2550],
  au: [760, 1300, 2550],
};
/** Diphthongs glide from "a" towards these. */
const GLIDE_TARGET: Partial<Record<VowelQuality, Formants>> = { ai: VOWEL_FORMANTS.i, au: VOWEL_FORMANTS.u };

/** Centre of the hiss or burst for each noisy consonant (Hz). */
const NOISE_HZ: Record<string, number> = {
  "க": 1800, "ட": 2600, "த": 3800, "ப": 1100, "ற": 3000, "ச": 3600, "ஜ": 3200, "ஷ": 3400, "ஸ": 5800, "ஶ": 4200, "ஹ": 1500,
};

/** Nasals, liquids and glides: how loud the voicing is and where their formants sit. */
const VOICED_CONSONANTS: Record<string, { voice: number; formants: Formants }> = {
  "ம": { voice: 0.36, formants: [260, 1000, 2500] },
  "ந": { voice: 0.45, formants: [260, 1500, 2600] },
  "ன": { voice: 0.45, formants: [260, 1550, 2600] },
  "ண": { voice: 0.45, formants: [270, 1750, 2500] },
  "ஞ": { voice: 0.45, formants: [270, 2100, 2800] },
  "ங": { voice: 0.45, formants: [270, 2200, 2700] },
  "ர": { voice: 0.62, formants: [460, 1350, 1850] },
  "ல": { voice: 0.6, formants: [380, 1250, 2650] },
  "ள": { voice: 0.6, formants: [400, 1300, 2150] },
  "ழ": { voice: 0.6, formants: [460, 1300, 1700] },
  "ய": { voice: 0.6, formants: [300, 2150, 2900] },
  "வ": { voice: 0.5, formants: [330, 820, 2300] },
};

interface Phase {
  start: number;
  end: number;
  voice: number;
  noise: number;
  noiseHz: number;
  from: Formants;
  to: Formants;
}

/** Turns symbols + durations into a list of sound phases (silence, burst, hiss, voiced, vowel). */
function buildPhases(plan: SpeechPlan): { phases: Phase[]; accents: number[] } {
  const phases: Phase[] = [];
  const accents: number[] = [];
  let cursor = 0;
  let formants: Formants = VOWEL_FORMANTS.a;
  let wordStart = true;

  const push = (length: number, voice: number, noise = 0, noiseHz = 0, from = formants, to = from) => {
    if (length <= 0) return;
    phases.push({ start: cursor, end: cursor + length, voice, noise, noiseHz, from, to });
    cursor += length;
    if (voice > 0) formants = to;
  };
  const pushVowel = (length: number, quality: VowelQuality) => {
    // The first vowel of each word carries the stress (Tamil stresses the first syllable).
    if (wordStart) accents.push(cursor / plan.sampleRate);
    push(length, wordStart ? 1.15 : 1, 0, 0, VOWEL_FORMANTS[quality], GLIDE_TARGET[quality] ?? VOWEL_FORMANTS[quality]);
    wordStart = false;
  };
  const pushConsonant = (char: string, manner: Manner, length: number, coda: boolean) => {
    const voiced = VOICED_CONSONANTS[char];
    const noiseHz = NOISE_HZ[char] ?? 3000;
    if (voiced) return push(length, voiced.voice, 0.02, 0, voiced.formants);
    if (manner === "stop") {
      const closure = coda ? length : Math.round(length * 0.65);
      push(closure, 0);
      return push(length - closure, 0.15, 0.55, noiseHz);
    }
    if (manner === "affricate") {
      const closure = Math.round(length * 0.4);
      push(closure, 0);
      return push(length - closure, char === "ஜ" ? 0.25 : 0, 0.45, noiseHz);
    }
    push(length, char === "ஹ" ? 0.15 : 0, char === "ஹ" ? 0.3 : 0.4, noiseHz);
  };

  plan.symbols.forEach((symbol, i) => {
    const length = Math.max(1, Math.round(plan.durations[i])) * plan.hopSamples;
    const info = describeChar(symbol);
    const next = describeChar(plan.symbols[i + 1] ?? " ");
    if (info.kind === "vowel" || info.kind === "sign") {
      pushVowel(length, info.vowel);
    } else if (info.kind === "consonant") {
      // A consonant with no vowel sign and no pulli carries the built-in "a" vowel.
      const inherent = next.kind !== "sign" && next.kind !== "virama";
      const consonantLength = inherent ? Math.round(length * 0.42) : length;
      pushConsonant(symbol, info.manner, consonantLength, next.kind === "virama");
      if (inherent) pushVowel(length - consonantLength, "a");
    } else if (info.kind === "virama") {
      const previous = VOICED_CONSONANTS[plan.symbols[i - 1] ?? ""];
      push(length, previous ? previous.voice * 0.7 : 0);
    } else {
      if (info.kind === "space") wordStart = true;
      push(length, 0);
    }
  });
  return { phases, accents };
}

function createResonator() {
  let a = 1;
  let b = 0;
  let c = 0;
  let y1 = 0;
  let y2 = 0;
  return {
    tune(frequency: number, bandwidth: number, sampleRate: number) {
      const r = Math.exp((-Math.PI * bandwidth) / sampleRate);
      c = -r * r;
      b = 2 * r * Math.cos((2 * Math.PI * frequency) / sampleRate);
      a = 1 - b - c;
    },
    step(x: number) {
      const y = a * x + b * y1 + c * y2;
      y2 = y1;
      y1 = y;
      return y;
    },
  };
}

/** One period of a smooth glottal pulse (Rosenberg shape); phase runs 0–1. */
function glottalPulse(phase: number): number {
  const open = 0.42;
  const close = 0.16;
  if (phase < open) return 0.5 * (1 - Math.cos((Math.PI * phase) / open));
  if (phase < open + close) return Math.cos((Math.PI * (phase - open)) / (2 * close));
  return 0;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function synthesizeSpeech(plan: SpeechPlan): Float32Array {
  const { phases, accents } = buildPhases(plan);
  const total = phases.length > 0 ? phases[phases.length - 1].end : 0;
  const out = new Float32Array(total);
  if (total === 0) return out;

  const sr = plan.sampleRate;
  const seconds = total / sr;
  const { meanPitchHz, pitchRange, energy } = plan.prosody;
  const rng = createRng(plan.seed);
  const [r1, r2, r3, hissFilter] = [createResonator(), createResonator(), createResonator(), createResonator()];
  // One-pole smoothing so loudness and formants glide instead of jumping (6 ms, 18 ms, 3 ms).
  const ampCoef = 1 - Math.exp(-1 / (0.006 * sr));
  const formantCoef = 1 - Math.exp(-1 / (0.018 * sr));
  const noiseCoef = 1 - Math.exp(-1 / (0.003 * sr));
  const breath = energy < 1 ? 0.06 : 0.035;

  let amp = 0;
  let noiseAmp = 0;
  let f1 = 500;
  let f2 = 1500;
  let f3 = 2500;
  let glottalPhase = 0;
  let previousPulse = 0;
  let jitter = 0;
  let index = 0;

  for (let n = 0; n < total; n++) {
    while (n >= phases[index].end) index++;
    const phase = phases[index];
    const progress = (n - phase.start) / (phase.end - phase.start);
    amp += (phase.voice - amp) * ampCoef;
    noiseAmp += (phase.noise - noiseAmp) * noiseCoef;
    f1 += ((phase.from[0] + (phase.to[0] - phase.from[0]) * progress) * plan.formantScale - f1) * formantCoef;
    f2 += ((phase.from[1] + (phase.to[1] - phase.from[1]) * progress) * plan.formantScale - f2) * formantCoef;
    f3 += ((phase.from[2] + (phase.to[2] - phase.from[2]) * progress) * plan.formantScale - f3) * formantCoef;

    // Pitch: gentle fall across the sentence, a lift on each stressed syllable,
    // a rise at the end of a question, tremor for fear, and a little natural wobble.
    const t = n / sr;
    if (n % 64 === 0) jitter = jitter * 0.95 + rng.normal(0, 0.004);
    let accent = 0;
    for (const at of accents) {
      const d = (t - at - 0.06) / 0.09;
      if (d > -3 && d < 3) accent += Math.exp(-d * d);
    }
    const rise = plan.question && t > seconds - 0.4 ? ((t - (seconds - 0.4)) / 0.4) ** 2 : 0;
    const shape = 1 + pitchRange * (0.07 - 0.15 * (t / seconds) + 0.08 * accent + 0.32 * rise);
    const tremor = 1 + plan.tremor * 0.03 * Math.sin(2 * Math.PI * 5.5 * t);
    const f0 = clamp(meanPitchHz * shape * tremor * (1 + jitter), 60, 450);

    glottalPhase += f0 / sr;
    if (glottalPhase >= 1) glottalPhase -= 1;
    const pulse = glottalPulse(glottalPhase);
    const excitation = (pulse - previousPulse) * (sr / f0) * 0.25 + (rng.next() * 2 - 1) * breath;
    previousPulse = pulse;

    if (n % 16 === 0) {
      r1.tune(f1, 90, sr);
      r2.tune(f2, 120, sr);
      r3.tune(f3, 170, sr);
      if (phase.noiseHz > 0) hissFilter.tune(phase.noiseHz, phase.noiseHz * 0.45, sr);
    }
    const voiced = r3.step(r2.step(r1.step(excitation * amp)));
    const hiss = hissFilter.step((rng.next() * 2 - 1) * noiseAmp);
    out[n] = voiced + hiss * 0.5;
  }

  return finish(out, sr, energy);
}

/** Removes DC, softens the top end, sets loudness from the energy setting, and fades the edges. */
function finish(samples: Float32Array, sampleRate: number, energy: number): Float32Array {
  const lowPass = 1 - Math.exp((-2 * Math.PI * 5500) / sampleRate);
  let x1 = 0;
  let y1 = 0;
  let smooth = 0;
  for (let n = 0; n < samples.length; n++) {
    const highPassed = samples[n] - x1 + 0.995 * y1;
    x1 = samples[n];
    y1 = highPassed;
    smooth += (highPassed - smooth) * lowPass;
    samples[n] = smooth;
  }
  let sum = 0;
  let active = 0;
  for (const value of samples) {
    if (Math.abs(value) > 1e-4) {
      sum += value * value;
      active++;
    }
  }
  const rms = active > 0 ? Math.sqrt(sum / active) : 0;
  const targetRms = 0.11 + 0.08 * clamp((energy - 0.8) / 0.6, 0, 1);
  const gain = rms > 0 ? targetRms / rms : 0;
  const fade = Math.round(0.008 * sampleRate);
  for (let n = 0; n < samples.length; n++) {
    const edge = Math.min(1, n / fade, (samples.length - 1 - n) / fade);
    samples[n] = (Math.tanh(samples[n] * gain * 1.2) / 1.2) * edge; // soft limit, never clips
  }
  return samples;
}

/** 16-bit PCM mono WAV file bytes. */
export function encodeWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = pcm.length * 2;
  const view = new DataView(new ArrayBuffer(44 + dataBytes));
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < pcm.length; i++) {
    const sample = clamp(pcm[i], -1, 1);
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(view.buffer);
}
