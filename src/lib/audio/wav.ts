// Reading WAV audio, shared by the mock TTS route (server) and the waveform views (browser).

/** The bytes inside a base64 string (works in the browser and in Node). */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** Reads a PCM or float WAV file into mono samples. Returns null for anything it can't read. */
export function decodeWav(bytes: Uint8Array): { sampleRate: number; pcm: Float32Array } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 44 || text(0) !== "RIFF" || text(8) !== "WAVE") return null;
  let isFloat = false;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const id = text(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      const format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      isFloat = format === 3 || (format === 0xfffe && view.getUint16(body + 24, true) === 3);
    } else if (id === "data") {
      if (!channels || !sampleRate || ![16, 24, 32].includes(bits)) return null;
      const width = bits / 8;
      const frames = Math.floor(Math.min(size, bytes.length - body) / (width * channels));
      const pcm = new Float32Array(frames);
      for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          const at = body + (f * channels + c) * width;
          if (bits === 16) sum += view.getInt16(at, true) / 32768;
          else if (bits === 24) sum += (view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16)) / 8388608;
          else sum += isFloat ? view.getFloat32(at, true) : view.getInt32(at, true) / 2147483648;
        }
        pcm[f] = sum / channels;
      }
      return { sampleRate, pcm };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

/** The loudest sample in each of `count` equal slices: enough to draw a waveform without the full audio. */
export function computePeaks(pcm: Float32Array, count: number): number[] {
  const size = Math.max(1, Math.floor(pcm.length / count));
  return Array.from({ length: Math.min(count, Math.ceil(pcm.length / size)) }, (_, i) => {
    let peak = 0;
    const end = Math.min(pcm.length, (i + 1) * size);
    for (let s = i * size; s < end; s++) peak = Math.max(peak, Math.abs(pcm[s]));
    return Math.round(peak * 1000) / 1000;
  });
}

/** Peaks straight from a base64 WAV, or an empty list if it can't be read. */
export function peaksFromBase64Wav(base64: string, count: number): number[] {
  const decoded = decodeWav(base64ToBytes(base64));
  return decoded ? computePeaks(decoded.pcm, count) : [];
}
