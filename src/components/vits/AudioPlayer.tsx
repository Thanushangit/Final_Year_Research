"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/Button";
import type { Emotion, SpeakerId, TtsResponse } from "@/lib/api/contracts";
import { audioEngine } from "@/lib/audio/audioEngine";
import { peaksFromBase64Wav } from "@/lib/audio/wav";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";

interface AudioPlayerProps {
  audio: TtsResponse["audio"];
  speakerId: SpeakerId;
  emotion: Emotion;
}

const two = (n: number) => String(n).padStart(2, "0");

/** tts-SPK02-sadness-20261005-143012.wav */
function fileName(speakerId: SpeakerId, emotion: Emotion): string {
  const now = new Date();
  const date = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`;
  const time = `${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  return `tts-${speakerId}-${emotion}-${date}-${time}.wav`;
}

/**
 * The voice with its waveform. wavesurfer.js draws on the shared <audio> element, so its cursor, the
 * robot's lips and "Play voice" all follow the same sound. It gets ready-made peaks, so it never
 * loads or decodes the audio a second time.
 */
export function AudioPlayer({ audio, speakerId, emotion }: AudioPlayerProps) {
  const waveRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(() => audioEngine.isPlaying);
  const playVoice = usePipelineStore((s) => s.playVoice);
  const voiceBlocked = usePipelineStore((s) => s.voiceBlocked);
  const peaks = useMemo(() => peaksFromBase64Wav(audio.base64Wav, 800), [audio.base64Wav]);

  useEffect(() => {
    const container = waveRef.current;
    if (!container) return;
    audioEngine.load(audio.base64Wav);
    const url = audioEngine.voiceSource;
    const media = audioEngine.media;
    let surfer: WaveSurfer | null = null;
    let cancelled = false;
    // Loaded only when needed, and only in the browser.
    void import("wavesurfer.js").then(({ default: WaveSurferClass }) => {
      if (cancelled || !url) return;
      surfer = WaveSurferClass.create({
        container,
        media,
        url,
        peaks: [peaks],
        duration: audio.durationSec,
        height: 64,
        waveColor: "#b4bfd1",
        progressColor: "#1b2e50",
        cursorColor: "#c9a227",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        dragToSeek: true,
      });
      surfer.on("timeupdate", (time) => setCurrentTime(time));
    });
    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onStop);
    media.addEventListener("ended", onStop);
    return () => {
      cancelled = true;
      surfer?.destroy();
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onStop);
      media.removeEventListener("ended", onStop);
    };
  }, [audio.base64Wav, audio.durationSec, peaks]);

  const play = () => {
    audioEngine.unlock();
    playVoice();
  };

  const download = () => {
    const url = audioEngine.voiceSource;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName(speakerId, emotion);
    document.body.append(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-3">
      {/* Click or drag the waveform to move the playback position. Screen readers use the buttons below. */}
      <div ref={waveRef} aria-hidden="true" className="min-h-16 rounded-md bg-mist/50 px-2" />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={play} className={cn(voiceBlocked && "animate-pulse")}>
          Play voice
        </Button>
        <Button variant="secondaryLight" onClick={download}>
          Download voice
        </Button>
        <p className="ml-auto text-sm text-navy tabular-nums" aria-live="off">
          {currentTime.toFixed(1)} / {audio.durationSec.toFixed(1)} s
        </p>
      </div>
      <p className="text-xs text-slate">
        {playing ? "Playing. " : ""}
        {audio.durationSec.toFixed(2)} s · {(audio.sampleRate / 1000).toFixed(audio.sampleRate % 1000 ? 2 : 0)} kHz · mono
        WAV
      </p>
      {voiceBlocked && (
        <p role="status" className="text-sm text-navy">
          The browser held the sound back. Press Play voice to hear it.
        </p>
      )}
    </div>
  );
}
