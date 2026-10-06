import { EMOTIONS, type Emotion, type EmotionScores } from "@/lib/api/contracts";

/** Long sentences show their first tokens only, so the heatmaps stay readable. */
export const MAX_TOKEN_ROWS = 24;

/** Builds a value for each of the five emotions. */
export function perEmotion(valueFor: (emotion: Emotion) => number): Record<Emotion, number> {
  return {
    neutral: valueFor("neutral"),
    happiness: valueFor("happiness"),
    sadness: valueFor("sadness"),
    anger: valueFor("anger"),
    fear: valueFor("fear"),
  };
}

/** Whole numbers around the raw scores, always including 0 (and at least 0 to 1). */
export function logitDomain(logits: EmotionScores): [number, number] {
  const values = EMOTIONS.map((emotion) => logits[emotion]);
  return [Math.min(0, Math.floor(Math.min(...values))), Math.max(1, Math.ceil(Math.max(...values)))];
}
