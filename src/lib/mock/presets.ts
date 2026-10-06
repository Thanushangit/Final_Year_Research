import type { Emotion } from "@/lib/api/contracts";
import { normalizeTamilText } from "./tamilText";

export interface Preset {
  emotion: Emotion;
  text: string;
}

/** One sample Sri Lankan Tamil sentence per emotion, shown as one-click chips. */
export const PRESETS: readonly Preset[] = [
  { emotion: "neutral", text: "நாளை காலை பத்து மணிக்கு கூட்டம் நடைபெறும்." },
  { emotion: "happiness", text: "எனக்கு பல்கலைக்கழகத்தில் இடம் கிடைத்தது, மிகவும் சந்தோசமாக இருக்கிறது!" },
  { emotion: "sadness", text: "அம்மா ஊருக்குப் போனதிலிருந்து வீடு வெறுமையாக இருக்கிறது." },
  { emotion: "anger", text: "எத்தனை முறை சொன்னாலும் நீ கேட்கவே மாட்டாயா?" },
  { emotion: "fear", text: "இரவில் யாரோ கதவைத் தட்டும் சத்தம் கேட்டது, எனக்கு பயமாக இருக்கிறது." },
];

/** The preset this text matches, ignoring spacing and Unicode form differences. */
export function findPreset(text: string): Preset | undefined {
  const normalized = normalizeTamilText(text);
  return PRESETS.find((preset) => normalizeTamilText(preset.text) === normalized);
}
