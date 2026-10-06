// Deterministic randomness: the same text always produces the same "random" numbers,
// so the sample data never changes between runs.

/** FNV-1a 32-bit hash of a string. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small seeded random generator (mulberry32) with a few helpers. */
export function createRng(seed: number) {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    /** Normally distributed number (Box-Muller). */
    normal: (mean = 0, spread = 1) => {
      let u = 0;
      while (u === 0) u = next();
      return mean + spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** A generator seeded from several parts, e.g. rngFor("attention", text). */
export function rngFor(...parts: Array<string | number>): Rng {
  return createRng(hashString(parts.join("|")));
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
