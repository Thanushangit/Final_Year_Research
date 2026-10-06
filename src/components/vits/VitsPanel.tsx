"use client";

import type { ReactNode } from "react";
import { LabPanel } from "@/components/ui/LabPanel";
import { PanelError } from "@/components/ui/PanelError";
import { StepCard, stepStatus } from "@/components/ui/StepCard";
import type { EmotionResponse, SpeakerId, TtsResponse } from "@/lib/api/contracts";
import { usePipelineStore } from "@/store/pipelineStore";
import { AudioPlayer } from "./AudioPlayer";
import { AlignmentStep } from "./steps/AlignmentStep";
import { ConditioningStep } from "./steps/ConditioningStep";
import { DurationStep } from "./steps/DurationStep";
import { FlowDecoderStep } from "./steps/FlowDecoderStep";
import { InputsStep } from "./steps/InputsStep";
import { SymbolsStep } from "./steps/SymbolsStep";
import { TextEncoderStep } from "./steps/TextEncoderStep";
import { VITS_STEPS } from "./vitsSteps";

/** The model's time for a step, shown at the right of its title. */
function stepTiming(index: number, timings: TtsResponse["timingsMs"]): string | undefined {
  if (index === 3) return `${timings.textEncoder} ms`;
  if (index === 4) return `${timings.durationPredictor} ms`;
  if (index === 6) return `${timings.flow} + ${timings.decoder} ms`;
  return undefined;
}

/** The picture for steps 2 to 8. They all need the speech model's answer. */
function stepView(index: number, tts: TtsResponse, emotion: EmotionResponse, speakerId: SpeakerId, speed: number): ReactNode {
  const totalFrames = tts.durations.reduce((sum, frames) => sum + frames, 0);
  switch (index) {
    case 1:
      return <SymbolsStep symbols={tts.inputSymbols} text={emotion.normalizedText} speed={speed} />;
    case 2:
      return (
        <ConditioningStep
          speakerId={speakerId}
          vector={emotion.probabilities}
          speakerEmbedding={tts.speakerEmbeddingPreview}
          emotionEmbedding={tts.emotionEmbeddingPreview}
          speed={speed}
        />
      );
    case 3:
      return <TextEncoderStep symbols={tts.inputSymbols} speed={speed} />;
    case 4:
      return (
        <DurationStep
          symbols={tts.inputSymbols}
          durations={tts.durations}
          sampleRate={tts.audio.sampleRate}
          prosody={tts.prosody}
          speed={speed}
        />
      );
    case 5:
      return (
        <AlignmentStep
          symbols={tts.inputSymbols}
          durations={tts.durations}
          alignment={tts.alignment}
          sampleRate={tts.audio.sampleRate}
          speed={speed}
        />
      );
    case 6:
      return (
        <FlowDecoderStep
          totalFrames={totalFrames}
          base64Wav={tts.audio.base64Wav}
          sampleRate={tts.audio.sampleRate}
          durationSec={tts.audio.durationSec}
          mel={tts.melSpectrogram}
          speed={speed}
        />
      );
    case 7:
      return <AudioPlayer audio={tts.audio} speakerId={speakerId} emotion={emotion.predictedEmotion} />;
    default:
      return null;
  }
}

export function VitsPanel() {
  const stage = usePipelineStore((s) => s.stage);
  const vitsStep = usePipelineStore((s) => s.vitsStep);
  const emotion = usePipelineStore((s) => s.emotion);
  const speakerId = usePipelineStore((s) => s.speakerId);
  const tts = usePipelineStore((s) => s.tts);
  const error = usePipelineStore((s) => s.error);
  const speed = usePipelineStore((s) => s.speed);
  const waiting = stage === "speaking" && !tts && vitsStep === 0 ? 1 : null;

  return (
    <LabPanel
      id="vits"
      title="Speaking"
      model="VITS"
      intro="Turns the sentence into a voice with that feeling."
      source={tts?.source}
    >
      {error?.panel === "vits" && <PanelError message={error.message} />}
      <ol>
        {VITS_STEPS.map((step, index) => (
          <StepCard
            key={step.title}
            number={index + 1}
            title={step.title}
            summary={step.summary}
            detail={step.detail}
            status={stepStatus(index, vitsStep, waiting)}
            anchor={index === 0 ? "vits-inputs" : undefined}
            aside={tts ? stepTiming(index, tts.timingsMs) : undefined}
          >
            {emotion && speakerId && (index === 0 ? (
              <InputsStep text={emotion.normalizedText} speakerId={speakerId} vector={emotion.probabilities} speed={speed} />
            ) : (
              tts && stepView(index, tts, emotion, speakerId, speed)
            ))}
          </StepCard>
        ))}
      </ol>
    </LabPanel>
  );
}
