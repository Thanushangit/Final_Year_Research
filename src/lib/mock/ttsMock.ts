// Sample VITS output. Deterministic for the same text, speaker and emotion vector.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EMOTIONS,
  type Emotion,
  type EmotionVector,
  type Prosody,
  type SpeakerId,
  type TtsRequest,
  type TtsResponse,
} from "@/lib/api/contracts";
import { hashString, rngFor, roundTo } from "./seeded";
import { logMelSpectrogram } from "./spectrogram";
import { describeChar, normalizeTamilText, toModelSymbols } from "./tamilText";
import { decodeWav } from "@/lib/audio/wav";
import { encodeWav, synthesizeSpeech } from "./wavEncoder";

/** MMS-TTS Tamil outputs 16 kHz audio; one frame is 256 samples (16 ms). */
const SAMPLE_RATE = 16000;
const HOP = 256;
const MAX_ALIGNMENT_COLUMNS = 400;

/** How each emotion shifts the voice (1 = no change). The output mixes these by probability. */
const EMOTION_PROSODY: Record<Emotion, { pitch: number; range: number; energy: number; rate: number }> = {
  neutral: { pitch: 1, range: 1, energy: 1, rate: 1 },
  happiness: { pitch: 1.12, range: 1.3, energy: 1.12, rate: 1.1 },
  sadness: { pitch: 0.9, range: 0.75, energy: 0.82, rate: 0.84 },
  anger: { pitch: 1.05, range: 1.2, energy: 1.38, rate: 1.06 },
  fear: { pitch: 1.16, range: 1.45, energy: 0.94, rate: 1.08 },
};

/** Small differences between the four sample voices. */
const SPEAKER_VOICE: Record<SpeakerId, { pitchHz: number; range: number; energy: number; rate: number; formantScale: number }> = {
  SPK01: { pitchHz: 205, range: 1.04, energy: 1, rate: 1, formantScale: 1.08 },
  SPK02: { pitchHz: 118, range: 0.95, energy: 1.04, rate: 0.97, formantScale: 0.93 },
  SPK03: { pitchHz: 188, range: 1, energy: 0.97, rate: 1.03, formantScale: 1.05 },
  SPK04: { pitchHz: 132, range: 0.98, energy: 1.02, rate: 0.99, formantScale: 0.96 },
};

/** Thrown when none of the sentence's characters are in the model's alphabet. */
export class UnreadableTextError extends Error {}

function blendProsody(vector: EmotionVector, speakerId: SpeakerId): Prosody {
  const voice = SPEAKER_VOICE[speakerId];
  const mix = (key: "pitch" | "range" | "energy" | "rate") =>
    EMOTIONS.reduce((sum, emotion) => sum + vector[emotion] * EMOTION_PROSODY[emotion][key], 0);
  return {
    meanPitchHz: Math.round(voice.pitchHz * mix("pitch")),
    pitchRange: roundTo(voice.range * mix("range"), 2),
    energy: roundTo(voice.energy * mix("energy"), 2),
    speakingRate: roundTo(voice.rate * mix("rate"), 2),
  };
}

/** Frames per symbol at normal speed: long vowels longest, pulli shortest, spaces as short pauses. */
function baseFrames(symbol: string, next: string | undefined): number {
  const info = describeChar(symbol);
  const after = describeChar(next ?? " ");
  if (info.kind === "space") return 6;
  if (info.kind === "virama") return 2;
  if (info.kind === "vowel" || info.kind === "sign") return info.long ? 8 : 5;
  if (info.kind !== "consonant") return 3;
  if (after.kind === "sign") return info.manner === "stop" || info.manner === "affricate" ? 5 : 4;
  if (after.kind === "virama") return 4;
  return 8; // consonant plus its built-in "a"
}

function predictDurations(symbols: string[], pauses: number[], rate: number, seedText: string): number[] {
  const rng = rngFor("durations", seedText);
  return symbols.map((symbol, i) => {
    let frames = baseFrames(symbol, symbols[i + 1]) * (1 + rng.normal(0, 0.12)) + pauses[i] * 7;
    if (i >= symbols.length - 2) frames *= 1.3; // the last sound of a sentence is drawn out
    return Math.max(1, Math.round(frames / rate));
  });
}

/** Stretches durations so they add up to a given frame count (used with real sample recordings). */
function fitDurations(durations: number[], targetFrames: number): number[] {
  const total = durations.reduce((sum, frames) => sum + frames, 0);
  let carry = 0;
  return durations.map((frames) => {
    const exact = (frames * targetFrames) / total + carry;
    const rounded = Math.max(1, Math.round(exact));
    carry = exact - rounded;
    return rounded;
  });
}

/** Symbols × frames: 1 where a frame belongs to the symbol. Long outputs are averaged into fewer columns. */
function buildAlignment(durations: number[]): number[][] {
  const total = durations.reduce((sum, frames) => sum + frames, 0);
  const group = Math.max(1, Math.ceil(total / MAX_ALIGNMENT_COLUMNS));
  const columns = Math.ceil(total / group);
  let start = 0;
  return durations.map((frames) => {
    const row = new Array<number>(columns).fill(0);
    for (let f = start; f < start + frames; f++) row[Math.floor(f / group)] += 1 / group;
    start += frames;
    return row.map((value) => roundTo(value, 2));
  });
}

/** Speaker lane: one fixed row of the speaker lookup table. */
function speakerEmbedding(speakerId: SpeakerId): number[] {
  const rng = rngFor("speaker-table", speakerId);
  return Array.from({ length: 16 }, () => roundTo(rng.normal(0, 0.5), 3));
}

/** Emotion lane: a fixed linear projection (16 × 5 weights plus bias) of the probability vector. */
function emotionEmbedding(vector: EmotionVector): number[] {
  const rng = rngFor("emotion-projection");
  const weights = Array.from({ length: 16 }, () => EMOTIONS.map(() => rng.normal(0, 0.7)));
  const bias = Array.from({ length: 16 }, () => rng.normal(0, 0.05));
  return weights.map((row, k) =>
    roundTo(row.reduce((sum, weight, e) => sum + weight * vector[EMOTIONS[e]], bias[k]), 3),
  );
}

/** A real recording from public/mock-audio, if one exists for this speaker. */
async function loadSampleRecording(speakerId: SpeakerId) {
  try {
    const file = path.join(process.cwd(), "public", "mock-audio", `${speakerId}.wav`);
    const bytes = new Uint8Array(await readFile(file));
    const decoded = decodeWav(bytes);
    return decoded ? { bytes, ...decoded } : null;
  } catch {
    return null;
  }
}

export async function mockTts(request: TtsRequest): Promise<TtsResponse> {
  const text = normalizeTamilText(request.text);
  const { symbols, pauses } = toModelSymbols(text);
  if (symbols.length === 0) {
    throw new UnreadableTextError("The speech model can't read any of the characters in this sentence.");
  }
  const { speakerId, emotionVector } = request;
  const prosody = blendProsody(emotionVector, speakerId);
  const seed = hashString(`${text}|${speakerId}|${JSON.stringify(emotionVector)}`);
  let durations = predictDurations(symbols, pauses, prosody.speakingRate, `${text}|${speakerId}`);

  let pcm: Float32Array;
  let sampleRate = SAMPLE_RATE;
  let wavBytes: Uint8Array;
  const recording = await loadSampleRecording(speakerId);
  if (recording) {
    ({ pcm, sampleRate, bytes: wavBytes } = recording);
    const frames = Math.round((pcm.length / sampleRate) * (SAMPLE_RATE / HOP));
    durations = fitDurations(durations, Math.max(symbols.length, frames));
  } else {
    pcm = synthesizeSpeech({
      symbols,
      durations,
      hopSamples: HOP,
      sampleRate,
      prosody,
      formantScale: SPEAKER_VOICE[speakerId].formantScale,
      tremor: emotionVector.fear,
      question: /\?\s*$/.test(text),
      seed,
    });
    wavBytes = encodeWav(pcm, sampleRate);
  }

  const totalFrames = durations.reduce((sum, frames) => sum + frames, 0);
  const durationSec = roundTo(pcm.length / sampleRate, 3);
  const rng = rngFor("tts-timings", seed);
  return {
    source: "mock",
    inputSymbols: symbols,
    speakerEmbeddingPreview: speakerEmbedding(speakerId),
    emotionEmbeddingPreview: emotionEmbedding(emotionVector),
    durations,
    alignment: buildAlignment(durations),
    melSpectrogram: logMelSpectrogram(pcm, sampleRate, { hop: Math.round(sampleRate * 0.016) }),
    prosody,
    audio: { base64Wav: Buffer.from(wavBytes).toString("base64"), sampleRate, durationSec },
    timingsMs: {
      textEncoder: Math.round(8 + symbols.length * 0.22 + rng.range(0, 3)),
      durationPredictor: Math.round(3 + symbols.length * 0.05 + rng.range(0, 2)),
      flow: Math.round(10 + totalFrames * 0.05 + rng.range(0, 4)),
      decoder: Math.round(22 + durationSec * 10 + rng.range(0, 6)),
    },
  };
}
