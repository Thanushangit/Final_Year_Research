// Single source of truth for the API shapes shared by the UI, the mock routes and the future Python backend.
import { z } from "zod";

/** The five emotion classes, in the order the classifier outputs them. */
export const EMOTIONS = ["neutral", "happiness", "sadness", "anger", "fear"] as const;
export const SPEAKER_IDS = ["SPK01", "SPK02", "SPK03", "SPK04"] as const;
export const MAX_TEXT_LENGTH = 300;

export const EmotionSchema = z.enum(EMOTIONS);
export const SpeakerIdSchema = z.enum(SPEAKER_IDS);
/** "mock" = sample data made by this app, "model" = the real Python backend. */
export const SourceSchema = z.enum(["mock", "model"]);

const TAMIL_LETTER = /[஀-௿]/;

// "abort" stops at the first problem, so an empty box gets one clear message, not two.
export const TamilTextSchema = z
  .string({ error: 'Send the sentence as a "text" string.' })
  .trim()
  .min(1, { error: "Type a Tamil sentence first.", abort: true })
  .max(MAX_TEXT_LENGTH, { error: `Keep the sentence to ${MAX_TEXT_LENGTH} characters or fewer.`, abort: true })
  .refine((text) => TAMIL_LETTER.test(text), "Write the sentence in Tamil script.");

/** VITS gets the normalised text, which can be longer than what was typed (numbers become words). */
export const TtsTextSchema = z
  .string({ error: 'Send the text to speak as a "text" string.' })
  .trim()
  .min(1, { error: "The text to speak is empty.", abort: true })
  .max(2000, { error: "The text to speak is too long.", abort: true })
  .refine((text) => TAMIL_LETTER.test(text), "The text to speak must be in Tamil script.");

const millisecondsSchema = z.number().nonnegative();
const probabilitySchema = z.number().min(0).max(1);

/** One raw score per emotion (the classifier's logits). */
export const EmotionScoresSchema = z.record(EmotionSchema, z.number());

/** One probability per emotion. They add up to 1. */
export const EmotionVectorSchema = z
  .record(EmotionSchema, probabilitySchema)
  .refine(
    (vector) => Math.abs(EMOTIONS.reduce((sum, emotion) => sum + vector[emotion], 0) - 1) < 0.02,
    "The emotion probabilities must add up to 1.",
  );

// ---------- POST /api/emotion (IndicBERT) ----------

export const EmotionRequestSchema = z.object({
  text: TamilTextSchema,
});

export const TokenSchema = z.object({
  token: z.string().min(1),
  id: z.number().int().nonnegative(),
});

export const EmotionResponseSchema = z
  .object({
    source: SourceSchema,
    normalizedText: z.string().min(1),
    tokens: z.array(TokenSchema).min(1),
    /** Tokens × 16: the first 16 of the 768 embedding values for each token. */
    embeddingPreview: z.array(z.array(z.number()).min(1)),
    /** Tokens × tokens: last-layer attention, averaged over the 12 heads. Each row adds up to 1. */
    attention: z.array(z.array(z.number().min(0))),
    /** The first 32 of the 768 values of the [CLS] sentence vector. */
    clsVectorPreview: z.array(z.number()).min(1),
    logits: EmotionScoresSchema,
    probabilities: EmotionVectorSchema,
    predictedEmotion: EmotionSchema,
    confidence: probabilitySchema,
    timingsMs: z.object({
      normalize: millisecondsSchema,
      tokenize: millisecondsSchema,
      encoder: millisecondsSchema,
      classify: millisecondsSchema,
    }),
  })
  .superRefine((result, ctx) => {
    const count = result.tokens.length;
    if (result.embeddingPreview.length !== count) {
      ctx.addIssue({
        code: "custom",
        path: ["embeddingPreview"],
        message: `Expected ${count} rows, one per token.`,
      });
    }
    if (result.attention.length !== count || result.attention.some((row) => row.length !== count)) {
      ctx.addIssue({
        code: "custom",
        path: ["attention"],
        message: `Expected a ${count} × ${count} matrix (tokens × tokens).`,
      });
    }
  });

// ---------- POST /api/tts (VITS) ----------

export const TtsRequestSchema = z.object({
  text: TtsTextSchema,
  speakerId: SpeakerIdSchema,
  /** The full probability vector from IndicBERT, not only the top label. */
  emotionVector: EmotionVectorSchema,
  predictedEmotion: EmotionSchema,
});

export const ProsodySchema = z.object({
  meanPitchHz: z.number().positive(),
  pitchRange: z.number().positive(),
  energy: z.number().positive(),
  speakingRate: z.number().positive(),
});

export const TtsResponseSchema = z
  .object({
    source: SourceSchema,
    /** The characters the model reads, one Unicode character each (MMS-TTS is character-based). */
    inputSymbols: z.array(z.string().min(1)).min(1),
    speakerEmbeddingPreview: z.array(z.number()).min(1),
    emotionEmbeddingPreview: z.array(z.number()).min(1),
    /** Frames per input symbol (one frame = 256 samples). */
    durations: z.array(z.number().nonnegative()),
    /** Symbols × frames, 0/1 or soft. Long outputs may be downsampled along the frame axis. */
    alignment: z.array(z.array(z.number().min(0).max(1)).min(1)),
    /** Mel bins × frames (low to high frequency), log scale, computed from the output audio. */
    melSpectrogram: z.array(z.array(z.number()).min(1)).min(1),
    prosody: ProsodySchema,
    audio: z.object({
      base64Wav: z.string().min(1),
      sampleRate: z.number().int().positive(),
      durationSec: z.number().positive(),
    }),
    timingsMs: z.object({
      textEncoder: millisecondsSchema,
      durationPredictor: millisecondsSchema,
      flow: millisecondsSchema,
      decoder: millisecondsSchema,
    }),
  })
  .superRefine((result, ctx) => {
    const count = result.inputSymbols.length;
    if (result.durations.length !== count) {
      ctx.addIssue({
        code: "custom",
        path: ["durations"],
        message: `Expected ${count} durations, one per input symbol.`,
      });
    }
    const frames = result.alignment[0]?.length ?? 0;
    if (result.alignment.length !== count || result.alignment.some((row) => row.length !== frames)) {
      ctx.addIssue({
        code: "custom",
        path: ["alignment"],
        message: `Expected ${count} rows of equal length (symbols × frames).`,
      });
    }
    const melFrames = result.melSpectrogram[0]?.length ?? 0;
    if (result.melSpectrogram.some((row) => row.length !== melFrames)) {
      ctx.addIssue({
        code: "custom",
        path: ["melSpectrogram"],
        message: "Every mel bin row must have the same number of frames.",
      });
    }
  });

// ---------- GET /api/health and error replies ----------

export const HealthResponseSchema = z.object({
  backend: SourceSchema,
});

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type Emotion = z.infer<typeof EmotionSchema>;
export type SpeakerId = z.infer<typeof SpeakerIdSchema>;
export type DataSource = z.infer<typeof SourceSchema>;
export type EmotionScores = z.infer<typeof EmotionScoresSchema>;
export type EmotionVector = z.infer<typeof EmotionVectorSchema>;
export type EmotionRequest = z.infer<typeof EmotionRequestSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type EmotionResponse = z.infer<typeof EmotionResponseSchema>;
export type TtsRequest = z.infer<typeof TtsRequestSchema>;
export type Prosody = z.infer<typeof ProsodySchema>;
export type TtsResponse = z.infer<typeof TtsResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
