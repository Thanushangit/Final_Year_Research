// Tamil text helpers shared by the mock models and the UI: letters, number words,
// normalisation, and the character alphabet MMS-TTS Tamil reads.

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("ta", { granularity: "grapheme" })
    : null;

/** Splits text into the letters people see (grapheme clusters): "நாளை" becomes ["நா", "ளை"]. */
export function toGraphemes(text: string): string[] {
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), (part) => part.segment);
}

/** Groups single characters into letters: ["ந","ா","ள","ை"] becomes [["ந","ா"], ["ள","ை"]]. */
export function groupIntoLetters(symbols: string[]): string[][] {
  // A backend might send multi-character symbols; then each symbol stays on its own.
  if (symbols.some((symbol) => Array.from(symbol).length !== 1)) return symbols.map((s) => [s]);
  const groups: string[][] = [];
  let index = 0;
  for (const letter of toGraphemes(symbols.join(""))) {
    const size = Array.from(letter).length;
    groups.push(symbols.slice(index, index + size));
    index += size;
  }
  return groups;
}

// ---------- Numbers as Tamil words ----------

const UNITS = ["பூச்சியம்", "ஒன்று", "இரண்டு", "மூன்று", "நான்கு", "ஐந்து", "ஆறு", "ஏழு", "எட்டு", "ஒன்பது"];
const TEENS = ["பத்து", "பதினொன்று", "பன்னிரண்டு", "பதின்மூன்று", "பதினான்கு", "பதினைந்து", "பதினாறு", "பதினேழு", "பதினெட்டு", "பத்தொன்பது"];
const TENS = ["", "", "இருபது", "முப்பது", "நாற்பது", "ஐம்பது", "அறுபது", "எழுபது", "எண்பது", "தொண்ணூறு"];
const TENS_JOINING = ["", "", "இருபத்து", "முப்பத்து", "நாற்பத்து", "ஐம்பத்து", "அறுபத்து", "எழுபத்து", "எண்பத்து", "தொண்ணூற்று"];
const HUNDREDS = ["", "நூறு", "இருநூறு", "முந்நூறு", "நானூறு", "ஐந்நூறு", "அறுநூறு", "எழுநூறு", "எண்ணூறு", "தொள்ளாயிரம்"];
const HUNDREDS_JOINING = ["", "நூற்று", "இருநூற்று", "முந்நூற்று", "நானூற்று", "ஐந்நூற்று", "அறுநூற்று", "எழுநூற்று", "எண்ணூற்று", "தொள்ளாயிரத்து"];

/** Independent vowel and the vowel sign that replaces it when two words merge (அ has no sign). */
const VOWEL_SIGN_FOR: Record<string, string> = {
  "அ": "", "ஆ": "ா", "இ": "ி", "ஈ": "ீ", "உ": "ு", "ஊ": "ூ",
  "எ": "ெ", "ஏ": "ே", "ஐ": "ை", "ஒ": "ொ", "ஓ": "ோ", "ஔ": "ௌ",
};
const U_SIGN = "ு";

/** Joins number words the way Tamil writes them: இருபத்து + ஒன்று = இருபத்தொன்று. */
function joinWords(first: string, second: string): string {
  const sign = VOWEL_SIGN_FOR[second[0]];
  if (sign !== undefined && first.endsWith(U_SIGN)) return first.slice(0, -1) + sign + second.slice(1);
  return `${first} ${second}`;
}

function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return units === 0 ? TENS[tens] : joinWords(TENS_JOINING[tens], UNITS[units]);
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0 ? HUNDREDS[hundreds] : joinWords(HUNDREDS_JOINING[hundreds], below100(rest));
}

/** Writes a whole number from 0 to 99 999 as Tamil words. */
export function numberToTamilWords(value: number): string {
  if (value < 1000) return below1000(value);
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  const thousandWords = thousands === 1 ? "ஆயிரம்" : joinWords(below100(thousands), "ஆயிரம்");
  return rest === 0 ? thousandWords : joinWords(thousandWords.replace(/ம்$/, "த்து"), below1000(rest));
}

const readDigits = (digits: string) => Array.from(digits, (digit) => UNITS[Number(digit)]).join(" ");

function spellNumber(number: string): string {
  const [whole, fraction] = number.split(".");
  const wholeWords = whole.length > 5 ? readDigits(whole) : numberToTamilWords(Number(whole));
  return fraction ? `${wholeWords} புள்ளி ${readDigits(fraction)}` : wholeWords;
}

// ---------- Normalisation ----------

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/கி\.மீ\.?/g, "கிலோமீட்டர்"],
  [/ரூ\.\s?/g, "ரூபாய் "],
  [/\bRs\.?\s?/g, "ரூபாய் "],
  [/\bDr\.\s?/g, "டாக்டர் "],
  [/%/g, " சதவீதம்"],
];

/**
 * The clean-up step before tokenising: Unicode NFC, invisible characters removed,
 * common abbreviations and numbers written out as Tamil words, spacing tidied.
 */
export function normalizeTamilText(raw: string): string {
  let text = raw.normalize("NFC").replace(/[​﻿]/g, "");
  text = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");
  for (const [pattern, replacement] of ABBREVIATIONS) text = text.replace(pattern, replacement);
  // Tamil digits (௦–௯) become ASCII digits first, then every number becomes words.
  text = text.replace(/[௦-௯]/g, (digit) => String(digit.charCodeAt(0) - 0x0be6));
  text = text.replace(/\d+(?:\.\d+)?/g, spellNumber);
  return text.replace(/\s+/g, " ").trim();
}

// ---------- What MMS-TTS Tamil reads ----------

/** Characters in facebook/mms-tts-tam's vocab.json, minus "3", which it uses as its blank token. */
const MMS_TAMIL_ALPHABET = new Set(
  Array.from(" '01245679_aஅஆஇஈஉஊஎஏஐஒஓகஙசஜஞடணதநனபமயரறலளழவஷஸஹாிீுூெேைொோௌ்"),
);

const PAUSE_WEIGHT: Record<string, number> = { ",": 1, ";": 1, ":": 1, ".": 2, "!": 2, "?": 2 };

export interface ModelSymbols {
  symbols: string[];
  /** Extra pause after each symbol (0 none, 1 comma, 2 full stop), from punctuation that was dropped. */
  pauses: number[];
}

/**
 * Turns text into the characters MMS-TTS Tamil reads. Characters outside its alphabet
 * (such as . , ! ?) are dropped, but remembered as pauses so the sample voice breathes there.
 */
export function toModelSymbols(text: string): ModelSymbols {
  const symbols: string[] = [];
  const pauses: number[] = [];
  let pendingPause = 0;
  for (const char of text.normalize("NFC").toLowerCase()) {
    const pause = PAUSE_WEIGHT[char];
    if (pause) {
      pendingPause = Math.max(pendingPause, pause);
    } else if (/\s/.test(char)) {
      if (symbols.length > 0 && symbols[symbols.length - 1] !== " ") {
        symbols.push(" ");
        pauses.push(pendingPause);
        pendingPause = 0;
      }
    } else if (MMS_TAMIL_ALPHABET.has(char)) {
      symbols.push(char);
      pauses.push(0);
    }
  }
  while (symbols[symbols.length - 1] === " ") {
    symbols.pop();
    pauses.pop();
  }
  return { symbols, pauses };
}

// ---------- Sound classes (used by the placeholder voice) ----------

export const VIRAMA = "்";
export type VowelQuality = "a" | "i" | "u" | "e" | "o" | "ai" | "au";
export type Manner = "stop" | "affricate" | "nasal" | "liquid" | "glide" | "fricative";

export type CharInfo =
  | { kind: "space" | "virama" | "other" }
  | { kind: "vowel" | "sign"; vowel: VowelQuality; long: boolean }
  | { kind: "consonant"; manner: Manner };

const VOWELS: Record<string, [VowelQuality, boolean]> = {
  "அ": ["a", false], "ஆ": ["a", true], "இ": ["i", false], "ஈ": ["i", true], "உ": ["u", false], "ஊ": ["u", true],
  "எ": ["e", false], "ஏ": ["e", true], "ஐ": ["ai", true], "ஒ": ["o", false], "ஓ": ["o", true], "ஔ": ["au", true],
};

const SIGNS: Record<string, [VowelQuality, boolean]> = {
  "ா": ["a", true], "ி": ["i", false], "ீ": ["i", true], "ு": ["u", false],
  "ூ": ["u", true], "ெ": ["e", false], "ே": ["e", true], "ை": ["ai", true],
  "ொ": ["o", false], "ோ": ["o", true], "ௌ": ["au", true],
};

const MANNERS: Record<string, Manner> = {
  "க": "stop", "ட": "stop", "த": "stop", "ப": "stop", "ற": "stop", "ச": "affricate", "ஜ": "affricate",
  "ங": "nasal", "ஞ": "nasal", "ண": "nasal", "ந": "nasal", "ம": "nasal", "ன": "nasal",
  "ர": "liquid", "ல": "liquid", "ள": "liquid", "ழ": "liquid", "ய": "glide", "வ": "glide",
  "ஷ": "fricative", "ஸ": "fricative", "ஹ": "fricative", "ஶ": "fricative",
};

export function describeChar(char: string): CharInfo {
  if (char === " ") return { kind: "space" };
  if (char === VIRAMA) return { kind: "virama" };
  const vowel = VOWELS[char];
  if (vowel) return { kind: "vowel", vowel: vowel[0], long: vowel[1] };
  const sign = SIGNS[char];
  if (sign) return { kind: "sign", vowel: sign[0], long: sign[1] };
  const manner = MANNERS[char];
  if (manner) return { kind: "consonant", manner };
  return { kind: "other" };
}
