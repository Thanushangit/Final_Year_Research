// Log-mel spectrogram of finished audio, for display only. VITS itself never makes one at inference
// time, so this is computed from the output waveform the same way the real backend should do it
// (STFT magnitude, Slaney mel filters, natural log, like the VITS training code).

interface MelOptions {
  nFft: number;
  hop: number;
  nMels: number;
  /** Longer outputs are averaged down to this many frames so the JSON stays small. */
  maxFrames: number;
}

const DEFAULTS: MelOptions = { nFft: 1024, hop: 256, nMels: 80, maxFrames: 320 };

const hzToMel = (hz: number) => (hz < 1000 ? (3 * hz) / 200 : 15 + (27 * Math.log(hz / 1000)) / Math.log(6.4));
const melToHz = (mel: number) => (mel < 15 ? (200 * mel) / 3 : 1000 * Math.exp((Math.log(6.4) / 27) * (mel - 15)));

/** The middle frequency (Hz) of mel band `band` (0 = lowest), for labels on a spectrogram. */
export function melBandCentreHz(band: number, nMels: number, sampleRate: number): number {
  return melToHz((hzToMel(sampleRate / 2) * (band + 1)) / (nMels + 1));
}

const filterCache = new Map<string, Float32Array[]>();

/** Triangular mel filters (Slaney scale and area normalisation, as in librosa's default). */
function melFilters(sampleRate: number, nFft: number, nMels: number): Float32Array[] {
  const key = `${sampleRate}:${nFft}:${nMels}`;
  const cached = filterCache.get(key);
  if (cached) return cached;
  const bins = nFft / 2 + 1;
  const maxMel = hzToMel(sampleRate / 2);
  const edges = Array.from({ length: nMels + 2 }, (_, i) => melToHz((maxMel * i) / (nMels + 1)));
  const filters = Array.from({ length: nMels }, (_, m) => {
    const [low, centre, high] = [edges[m], edges[m + 1], edges[m + 2]];
    const weights = new Float32Array(bins);
    for (let b = 0; b < bins; b++) {
      const hz = (b * sampleRate) / nFft;
      const rising = (hz - low) / (centre - low);
      const falling = (high - hz) / (high - centre);
      weights[b] = Math.max(0, Math.min(rising, falling)) * (2 / (high - low));
    }
    return weights;
  });
  filterCache.set(key, filters);
  return filters;
}

/** In-place radix-2 FFT using precomputed cos/sin tables of length n / 2. */
function fft(re: Float64Array, im: Float64Array, cosTable: Float64Array, sinTable: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size / 2;
    const stride = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < halfSize; k++) {
        const cos = cosTable[k * stride];
        const sin = -sinTable[k * stride];
        const a = start + k;
        const b = a + halfSize;
        const tre = re[b] * cos - im[b] * sin;
        const tim = re[b] * sin + im[b] * cos;
        re[b] = re[a] - tre;
        im[b] = im[a] - tim;
        re[a] += tre;
        im[a] += tim;
      }
    }
  }
}

/** Returns mel bins × frames (row 0 = lowest frequency), natural-log magnitude, 2 decimals. */
export function logMelSpectrogram(
  pcm: Float32Array,
  sampleRate: number,
  options: Partial<MelOptions> = {},
): number[][] {
  const { nFft, hop, nMels, maxFrames } = { ...DEFAULTS, ...options };
  const filters = melFilters(sampleRate, nFft, nMels);
  const half = nFft / 2;
  const window = Float64Array.from({ length: nFft }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nFft));
  const cosTable = Float64Array.from({ length: half }, (_, k) => Math.cos((2 * Math.PI * k) / nFft));
  const sinTable = Float64Array.from({ length: half }, (_, k) => Math.sin((2 * Math.PI * k) / nFft));
  const re = new Float64Array(nFft);
  const im = new Float64Array(nFft);
  const magnitude = new Float64Array(half + 1);
  const columns: Float64Array[] = [];

  const frameCount = 1 + Math.floor(pcm.length / hop);
  for (let f = 0; f < frameCount; f++) {
    const start = f * hop - half; // centred frames, zero padding at the edges
    for (let i = 0; i < nFft; i++) {
      const index = start + i;
      re[i] = index >= 0 && index < pcm.length ? pcm[index] * window[i] : 0;
      im[i] = 0;
    }
    fft(re, im, cosTable, sinTable);
    for (let b = 0; b <= half; b++) magnitude[b] = Math.sqrt(re[b] * re[b] + im[b] * im[b] + 1e-9);
    columns.push(
      Float64Array.from(filters, (weights) => {
        let energy = 0;
        for (let b = 0; b <= half; b++) energy += weights[b] * magnitude[b];
        return Math.log(Math.max(energy, 1e-5));
      }),
    );
  }

  // Average neighbouring frames when there are more than maxFrames.
  const group = Math.max(1, Math.ceil(columns.length / maxFrames));
  const pooled = Array.from({ length: Math.ceil(columns.length / group) }, (_, c) => {
    const slice = columns.slice(c * group, (c + 1) * group);
    return Float64Array.from({ length: nMels }, (_, m) => slice.reduce((sum, column) => sum + column[m], 0) / slice.length);
  });
  return Array.from({ length: nMels }, (_, m) => pooled.map((column) => Math.round(column[m] * 100) / 100));
}
