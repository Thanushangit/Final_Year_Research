// One shared AudioContext, AnalyserNode and <audio> element. The waveform player, "Play voice" and
// the robot's lip-sync all use this single sound source, so they always stay in step.
import { base64ToBytes } from "./wav";

/** 50 ms of silence, played inside a click so strict browsers (Safari) allow sound later on. */
function silentWavUrl(): string {
  const samples = 400;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([view.buffer], { type: "audio/wav" }));
}

class AudioEngine {
  private element: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private voiceUrl: string | null = null;
  private loadedVoice: string | null = null;
  private unlocked = false;

  /** The shared <audio> element. Created on first use, in the browser only. */
  get media(): HTMLAudioElement {
    if (!this.element) {
      this.element = new Audio();
      this.element.preload = "auto";
    }
    return this.element;
  }

  /** Live loudness and frequency data of whatever is playing (null if Web Audio is unavailable). */
  get analyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  get isPlaying(): boolean {
    return this.element !== null && !this.element.paused && !this.element.ended;
  }

  private connect(): void {
    if (this.context || typeof window === "undefined" || !window.AudioContext) return;
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.15;
    // A media element can only be connected once, so this runs a single time.
    this.context.createMediaElementSource(this.media).connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  /** Call inside a click or key handler: browsers only allow sound after the user has interacted. */
  unlock(): void {
    this.connect();
    void this.context?.resume();
    if (this.unlocked) return;
    this.unlocked = true;
    if (!this.media.src) {
      this.media.src = silentWavUrl();
      this.media.play().then(() => this.media.pause(), () => undefined);
    }
  }

  /** Loads a voice from base64 WAV. Loading the same voice again does nothing. */
  load(base64Wav: string): void {
    if (base64Wav === this.loadedVoice) return;
    const bytes = base64ToBytes(base64Wav);
    if (this.voiceUrl) URL.revokeObjectURL(this.voiceUrl);
    this.voiceUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    this.loadedVoice = base64Wav;
    this.media.src = this.voiceUrl;
  }

  /** The object URL of the loaded voice (for the waveform view and downloads). */
  get voiceSource(): string | null {
    return this.voiceUrl;
  }

  /** Plays the loaded voice from the start. Resolves false if the browser blocked the sound. */
  async playFromStart(): Promise<boolean> {
    if (!this.voiceUrl) return false;
    this.connect();
    try {
      await this.context?.resume();
      this.media.currentTime = 0;
      await this.media.play();
      // A suspended context would play silently, so treat it as blocked.
      if (this.context && this.context.state !== "running") {
        this.media.pause();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (!this.element) return;
    this.element.pause();
    if (this.element.readyState > 0) this.element.currentTime = 0;
  }
}

export const audioEngine = new AudioEngine();
