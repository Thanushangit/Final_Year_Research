// Word-by-word comparison of two versions of a sentence (used to show what normalisation changed).

export interface DiffWord {
  text: string;
  changed: boolean;
}

export interface DiffChange {
  before: string;
  after: string;
  /** The letters look the same; only their Unicode form changed. */
  unicodeOnly: boolean;
}

export interface WordDiff {
  before: DiffWord[];
  after: DiffWord[];
  /** Each run of changed words, paired up: "10" with "பத்து". */
  changes: DiffChange[];
}

const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

export function diffWords(beforeText: string, afterText: string): WordDiff {
  const a = splitWords(beforeText);
  const b = splitWords(afterText);
  // common[i][j] = length of the longest run of words shared by a[i..] and b[j..].
  const common = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }

  const result: WordDiff = { before: [], after: [], changes: [] };
  let removed: string[] = [];
  let added: string[] = [];
  const closeChange = () => {
    if (removed.length === 0 && added.length === 0) return;
    const before = removed.join(" ");
    const after = added.join(" ");
    result.changes.push({ before, after, unicodeOnly: before !== after && before.normalize("NFC") === after });
    removed = [];
    added = [];
  };

  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      closeChange();
      result.before.push({ text: a[i++], changed: false });
      result.after.push({ text: b[j++], changed: false });
    } else if (j < b.length && (i >= a.length || common[i][j + 1] >= common[i + 1][j])) {
      added.push(b[j]);
      result.after.push({ text: b[j++], changed: true });
    } else {
      removed.push(a[i]);
      result.before.push({ text: a[i++], changed: true });
    }
  }
  closeChange();
  return result;
}
