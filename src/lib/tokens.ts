// How to show tokenizer output. IndicBERTv2 is WordPiece: "##" marks a piece that joins the one before it.
// SentencePiece models mark the start of each word with "▁" instead. Both styles are understood here.

export type TokenKind = "special" | "word" | "piece" | "punctuation";

export interface TokenView {
  /** The text to show, without its marker. */
  text: string;
  /** "##" or "▁", drawn lighter in front of the text. */
  marker: "##" | "▁" | null;
  /** word = starts a word, piece = joins the token before it. */
  kind: TokenKind;
  /** Set to "ta" when the token holds Tamil letters, so it gets the Tamil font and pronunciation. */
  lang: "ta" | undefined;
}

const SPECIAL = /^(\[[A-Z]+\]|<\/?s>|<pad>|<unk>|<mask>)$/;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const TAMIL = /[஀-௿]/;

/** "ta" when the text contains Tamil letters. */
export const langOf = (text: string): "ta" | undefined => (TAMIL.test(text) ? "ta" : undefined);

export function describeTokens(tokens: readonly string[]): TokenView[] {
  const sentencePiece = tokens.some((token) => token.startsWith("▁"));
  return tokens.map((token): TokenView => {
    if (SPECIAL.test(token)) return { text: token, marker: null, kind: "special", lang: undefined };
    const marker = token.startsWith("##") && token.length > 2 ? "##" : token.startsWith("▁") ? "▁" : null;
    const text = (marker ? token.slice(marker.length) : token) || token;
    const continues = sentencePiece ? marker !== "▁" : marker === "##";
    const kind = !LETTER_OR_DIGIT.test(text) ? "punctuation" : continues ? "piece" : "word";
    return { text, marker, kind, lang: langOf(text) };
  });
}

/** Token positions grouped into words: a "piece" joins the word before it. */
export function groupTokensIntoWords(views: readonly TokenView[]): number[][] {
  const groups: number[][] = [];
  views.forEach((view, index) => {
    const previous = groups[groups.length - 1];
    const previousKind = previous ? views[previous[previous.length - 1]].kind : null;
    if (view.kind === "piece" && (previousKind === "word" || previousKind === "piece")) previous.push(index);
    else groups.push([index]);
  });
  return groups;
}

/** The token as plain text with its marker, for screen readers and tables. */
export const tokenName = (view: TokenView) => `${view.marker ?? ""}${view.text}`;
