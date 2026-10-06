// Sample IndicBERT output. Deterministic: the same text always gives the same numbers.
import "server-only";
import { EMOTIONS, type Emotion, type EmotionResponse, type EmotionScores } from "@/lib/api/contracts";
import { findPreset } from "./presets";
import { hashString, rngFor, roundTo } from "./seeded";
import { normalizeTamilText, toGraphemes } from "./tamilText";

type CueEmotion = Exclude<Emotion, "neutral">;

/** Word stems that hint at each emotion, with a weight. Stems match inflected words: சந்தோச matches சந்தோசமாக. */
const EMOTION_CUES: Record<CueEmotion, Array<[stem: string, weight: number]>> = {
  happiness: [["சந்தோச", 2], ["சந்தோஷ", 2], ["மகிழ்", 2], ["உற்சாக", 1.5], ["சிரிப்", 1.2], ["சிரித்", 1.2], ["கொண்டாட", 1.2], ["வாழ்த்து", 1], ["அருமை", 1]],
  sadness: [["கவலை", 2], ["வெறுமை", 2], ["துக்க", 2], ["சோக", 2], ["அழு", 1.6], ["வருத்த", 1.6], ["கண்ணீர்", 1.6], ["தனிமை", 1.4]],
  anger: [["கோப", 2], ["மாட்டாயா", 2], ["ஆத்திர", 2], ["எரிச்சல்", 1.6], ["சினம்", 1.6], ["திட்டு", 1], ["எத்தனை", 0.6]],
  fear: [["பயம", 2], ["பயந்", 2], ["அச்ச", 2], ["திகில்", 1.8], ["பீதி", 1.8], ["நடுங்", 1.6], ["ஆபத்து", 1.2]],
};

// Real IndicBERTv2 vocabulary ids for the special tokens and common punctuation.
const PUNCTUATION_IDS: Record<string, number> = {
  "!": 48, '"': 49, "'": 54, "(": 55, ")": 56, ",": 59, "-": 60, ".": 61, ":": 73, ";": 74, "?": 78,
};

// Endings a WordPiece vocabulary would keep as separate "##" pieces. Each starts with a consonant,
// so a split always falls between two letters. Longest first.
const SUFFIXES = ["லிருந்து", "த்திற்கு", "த்தில்", "னாலும்", "க்குப்", "கிறது", "த்தது", "க்கு", "த்தை", "களை", "கள்", "மாக", "யாக", "வும்", "வில்"];

// Same idea as the Hugging Face "Whitespace" pre-tokenizer: runs of letters, or runs of punctuation.
const WORD_PATTERN = /[\p{L}\p{M}\p{N}_]+|[^\p{L}\p{M}\p{N}_\s]+/gu;

interface Piece {
  token: string;
  id: number;
  /** Which word the piece came from (-1 for [CLS] and [SEP]). */
  word: number;
  wordText: string;
  punctuation: boolean;
}

const vocabId = (token: string) => 5000 + (hashString(`vocab|${token}`) % 245000);

function emotionRecord(valueFor: (emotion: Emotion) => number): EmotionScores {
  return {
    neutral: valueFor("neutral"),
    happiness: valueFor("happiness"),
    sadness: valueFor("sadness"),
    anger: valueFor("anger"),
    fear: valueFor("fear"),
  };
}

function cueWeight(text: string, emotion: Emotion): number {
  if (emotion === "neutral") return 0;
  return EMOTION_CUES[emotion].reduce((sum, [stem, weight]) => (text.includes(stem) ? sum + weight : sum), 0);
}

function splitStem(stem: string): string[] {
  const letters = toGraphemes(stem);
  if (letters.length <= 5) return [stem];
  const cut = Math.ceil(letters.length * 0.55);
  return [letters.slice(0, cut).join(""), ...splitStem(letters.slice(cut).join(""))];
}

/** Short words stay whole; long words split into a stem and "##" pieces, like WordPiece does. */
function splitWord(word: string): string[] {
  if (toGraphemes(word).length <= 4) return [word];
  for (const suffix of SUFFIXES) {
    const stem = word.slice(0, -suffix.length);
    if (word.endsWith(suffix) && toGraphemes(stem).length >= 2) return [...splitStem(stem), suffix];
  }
  return splitStem(word);
}

function tokenize(text: string): Piece[] {
  const pieces: Piece[] = [{ token: "[CLS]", id: 1, word: -1, wordText: "", punctuation: false }];
  let word = 0;
  for (const [match] of text.matchAll(WORD_PATTERN)) {
    if (!/[\p{L}\p{N}]/u.test(match)) {
      for (const char of match) {
        pieces.push({ token: char, id: PUNCTUATION_IDS[char] ?? vocabId(char), word, wordText: char, punctuation: true });
      }
    } else {
      splitWord(match).forEach((part, index) => {
        const token = index === 0 ? part : `##${part}`;
        pieces.push({ token, id: vocabId(token), word, wordText: match, punctuation: false });
      });
    }
    word += 1;
  }
  pieces.push({ token: "[SEP]", id: 2, word: -1, wordText: "", punctuation: false });
  return pieces;
}

function predictLogits(text: string): EmotionScores {
  const rng = rngFor("logits", text);
  const preset = findPreset(text);
  if (preset) {
    return emotionRecord((emotion) => {
      if (emotion === preset.emotion) return roundTo(rng.range(2.85, 3.25), 2);
      if (emotion === "neutral") return roundTo(rng.range(0.1, 0.55), 2);
      return roundTo(rng.normal(-0.6, 0.35), 2);
    });
  }
  const cues = emotionRecord((emotion) => cueWeight(text, emotion));
  const cueTotal = EMOTIONS.reduce((sum, emotion) => sum + cues[emotion], 0);
  return emotionRecord((emotion) =>
    roundTo(
      emotion === "neutral"
        ? 1.1 - 0.45 * cueTotal + rng.normal(0, 0.3)
        : -0.6 + 1.25 * cues[emotion] + rng.normal(0, 0.3),
      2,
    ),
  );
}

/** Rounds every value and moves any rounding leftover onto the largest value, so the total stays exact. */
function roundKeepingTotal(values: number[], digits: number, total: number): number[] {
  const rounded = values.map((value) => roundTo(value, digits));
  const top = rounded.indexOf(Math.max(...rounded));
  rounded[top] = roundTo(rounded[top] + total - rounded.reduce((sum, value) => sum + value, 0), digits);
  return rounded;
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

/** Token embedding preview: a fixed vector per token plus a small position signal. */
function tokenEmbedding(token: string, position: number): number[] {
  const rng = rngFor("embedding", token);
  return Array.from({ length: 16 }, (_, k) => {
    const angle = position / 10000 ** ((2 * Math.floor(k / 2)) / 16);
    const positional = k % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    return roundTo(rng.normal(0, 0.45) + 0.12 * positional, 3);
  });
}

/** Last-layer attention averaged over heads: neighbours, own word, [CLS]/[SEP] and the emotional words stand out. */
function attentionMatrix(pieces: Piece[], emotion: Emotion, text: string): number[][] {
  const rng = rngFor("attention", text);
  const last = pieces.length - 1;
  const cues = pieces.map((piece) => (piece.word < 0 ? 0 : Math.min(cueWeight(piece.wordText, emotion), 2.5)));
  return pieces.map((from, i) => {
    const scores = pieces.map((to, j) => {
      let score = rng.normal(-1.1, 0.35);
      if (i === j) score += 1.3;
      if (Math.abs(i - j) === 1) score += 0.9;
      if (i !== j && from.word >= 0 && from.word === to.word) score += 1.3;
      if (j === 0) score += 1.0;
      if (j === last) score += 0.6;
      if (to.punctuation) score -= 0.5;
      return score + cues[j] * (i === 0 ? 1.1 : 0.7);
    });
    return roundKeepingTotal(softmax(scores), 3, 1);
  });
}

/** [CLS] vector preview: noise plus a direction per emotion, weighted by its probability. */
function clsVector(text: string, probabilities: EmotionScores): number[] {
  const rng = rngFor("cls", text);
  const directions = EMOTIONS.map((emotion) => {
    const directionRng = rngFor("cls-direction", emotion);
    return Array.from({ length: 32 }, () => directionRng.normal(0, 1));
  });
  return Array.from({ length: 32 }, (_, k) => {
    const pull = EMOTIONS.reduce((sum, emotion, e) => sum + probabilities[emotion] * directions[e][k], 0);
    return roundTo(rng.normal(0, 0.22) + 0.5 * pull, 3);
  });
}

export function mockEmotion(rawText: string): EmotionResponse {
  const normalizedText = normalizeTamilText(rawText);
  const pieces = tokenize(normalizedText);
  const logits = predictLogits(normalizedText);
  const probabilityList = roundKeepingTotal(softmax(EMOTIONS.map((emotion) => logits[emotion])), 4, 1);
  const probabilities = emotionRecord((emotion) => probabilityList[EMOTIONS.indexOf(emotion)]);
  const predictedEmotion = EMOTIONS.reduce((best, emotion) =>
    probabilities[emotion] > probabilities[best] ? emotion : best,
  );
  const rng = rngFor("timings", normalizedText);

  return {
    source: "mock",
    normalizedText,
    tokens: pieces.map(({ token, id }) => ({ token, id })),
    embeddingPreview: pieces.map((piece, position) => tokenEmbedding(piece.token, position)),
    attention: attentionMatrix(pieces, predictedEmotion, normalizedText),
    clsVectorPreview: clsVector(normalizedText, probabilities),
    logits,
    probabilities,
    predictedEmotion,
    confidence: probabilities[predictedEmotion],
    timingsMs: {
      normalize: Math.round(2 + normalizedText.length / 80 + rng.range(0, 2)),
      tokenize: Math.round(3 + pieces.length * 0.15 + rng.range(0, 2)),
      encoder: Math.round(28 + pieces.length * 1.2 + rng.range(0, 8)),
      classify: Math.round(1 + rng.range(0, 2)),
    },
  };
}
