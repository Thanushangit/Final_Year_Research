import type { Emotion } from "@/lib/api/contracts";

export const EMOTION_LABEL: Record<Emotion, string> = {
  neutral: "Neutral",
  happiness: "Happiness",
  sadness: "Sadness",
  anger: "Anger",
  fear: "Fear",
};

export const EMOTION_TAMIL: Record<Emotion, string> = {
  neutral: "நடுநிலை",
  happiness: "மகிழ்ச்சி",
  sadness: "சோகம்",
  anger: "கோபம்",
  fear: "பயம்",
};

/** Hex colours for canvas and 3D drawing. Keep in sync with the @theme tokens in globals.css. */
export const EMOTION_HEX: Record<Emotion, string> = {
  neutral: "#8a94a6",
  happiness: "#e3b23c",
  sadness: "#4f7cac",
  anger: "#c2453d",
  fear: "#7a5c99",
};

/** Tailwind background classes, written out in full so Tailwind can find them. */
export const EMOTION_BG: Record<Emotion, string> = {
  neutral: "bg-emotion-neutral",
  happiness: "bg-emotion-happiness",
  sadness: "bg-emotion-sadness",
  anger: "bg-emotion-anger",
  fear: "bg-emotion-fear",
};
