/** One frame is 256 samples (MMS-TTS hop length); at 16 kHz that is 16 ms. */
export const HOP_SAMPLES = 256;

export const frameMs = (sampleRate: number) => (HOP_SAMPLES / sampleRate) * 1000;

/** A symbol as people should read it ("space" rather than an invisible gap). */
export const symbolName = (symbol: string) => (symbol === " " ? "space" : symbol);

export const formatSeconds = (seconds: number) => `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
