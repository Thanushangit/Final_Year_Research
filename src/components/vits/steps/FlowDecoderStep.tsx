"use client";

import { Fragment, useMemo } from "react";
import { Heatmap } from "@/components/ui/Heatmap";
import { WaveformView } from "@/components/ui/WaveformView";
import { peaksFromBase64Wav } from "@/lib/audio/wav";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { melBandCentreHz } from "@/lib/mock/spectrogram";
import { useAnimationClock } from "@/lib/useAnimationClock";
import { formatSeconds } from "./shared";

const STAGE_MS = 350;
const WAVE_MS = 900;

interface FlowDecoderStepProps {
  totalFrames: number;
  base64Wav: string;
  sampleRate: number;
  durationSec: number;
  /** Mel bands × frames, lowest band first. */
  mel: number[][];
  speed: number;
}

const formatHz = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`);

/** Step 7: latent frames → flow → decoder → waveform, then the spectrogram of the finished voice. */
export function FlowDecoderStep({ totalFrames, base64Wav, sampleRate, durationSec, mel, speed }: FlowDecoderStepProps) {
  const stages = [
    { name: "Latent frames", detail: `${totalFrames} × 192` },
    { name: "Flow", detail: "4 reversible steps" },
    { name: "Decoder", detail: "× 256 samples a frame" },
    { name: "Waveform", detail: `${(sampleRate / 1000).toFixed(0)} kHz` },
  ];
  const stagesMs = stages.length * STAGE_MS;
  const elapsed = useAnimationClock(stagesMs + WAVE_MS, { speed });
  const lit = Math.min(stages.length, Math.floor(elapsed / STAGE_MS) + 1);
  const waveProgress = Math.min(1, Math.max(0, (elapsed - stagesMs) / WAVE_MS));
  const peaks = useMemo(() => peaksFromBase64Wav(base64Wav, 320), [base64Wav]);

  const melMax = useMemo(() => Math.max(...mel.flat()), [mel]);
  // About 70 dB of range below the loudest point; quieter than that looks like silence.
  const melLow = useMemo(() => Math.max(Math.min(...mel.flat()), melMax - 8), [mel, melMax]);
  const melColumns = mel[0]?.length ?? 0;

  return (
    <div className="space-y-3">
      <ol aria-label="From latent frames to sound" className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {stages.map((stage, i) => (
          <Fragment key={stage.name}>
            {i > 0 && (
              <li aria-hidden="true" className="text-slate">
                <svg viewBox="0 0 12 10" className="h-2.5 w-3">
                  <path d="M1 5h9M7 1.5 10.5 5 7 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </li>
            )}
            <li
              className={cn(
                "rounded-md px-2 py-1 text-xs leading-tight transition-colors duration-300",
                i < lit ? "bg-navy text-white" : "bg-mist text-slate",
              )}
            >
              <span className="block font-medium">{stage.name}</span>
              <span className={cn("block tabular-nums", i < lit ? "text-white/80" : "text-slate")}>{stage.detail}</span>
            </li>
          </Fragment>
        ))}
      </ol>
      <WaveformView peaks={peaks} progress={waveProgress} />
      <div>
        <p className="text-sm font-medium text-navy">Spectrogram of the output voice</p>
        <p className="mb-2 text-xs text-slate">Worked out from the finished sound so you can see it. VITS does not make one.</p>
        <Heatmap
          values={mel}
          scale="sequential"
          domain={[melLow, melMax]}
          flipRows
          fixedHeightPx={96}
          reveal="columns"
          revealDelayMs={stagesMs + WAVE_MS}
          revealMs={1100}
          speed={speed}
          rowNames={mel.map((_, band) => formatHz(melBandCentreHz(band, mel.length, sampleRate)))}
          columnNames={[]}
          axis={{ start: "0 s", end: formatSeconds(durationSec) }}
          describeCell={({ row, col }, value) => (
            <>
              {((col / Math.max(melColumns, 1)) * durationSec).toFixed(2)} s, about{" "}
              {formatHz(melBandCentreHz(row, mel.length, sampleRate))}: loudness{" "}
              <span className="text-navy tabular-nums">{formatNumber(value, 1)}</span>
            </>
          )}
          hint="Low pitches at the bottom, high at the top. Darker means louder."
          label="Spectrogram of the output voice"
          summary={`${mel.length} frequency bands over ${formatSeconds(durationSec)}. Dark bands show the voice; pale gaps are pauses.`}
        />
      </div>
    </div>
  );
}
