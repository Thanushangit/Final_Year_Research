"use client";

import type { ReactNode } from "react";
import { LabPanel, stepId } from "@/components/ui/LabPanel";
import { PanelError } from "@/components/ui/PanelError";
import { StepCard, stepStatus } from "@/components/ui/StepCard";
import type { EmotionResponse } from "@/lib/api/contracts";
import { BERT_STEP_COUNT, usePipelineStore } from "@/store/pipelineStore";
import { BERT_STEPS } from "./bertSteps";
import { ClsVectorStep } from "./steps/ClsVectorStep";
import { EmbeddingsStep } from "./steps/EmbeddingsStep";
import { EncoderStep } from "./steps/EncoderStep";
import { InputStep } from "./steps/InputStep";
import { LogitsStep } from "./steps/LogitsStep";
import { NormalisationStep } from "./steps/NormalisationStep";
import { PredictionStep } from "./steps/PredictionStep";
import { SendStep } from "./steps/SendStep";
import { SoftmaxStep } from "./steps/SoftmaxStep";
import { TokensStep } from "./steps/TokensStep";

/** Which of the model's timings belongs to which step (shown at the right of the step title). */
const STEP_TIMING: Partial<Record<number, keyof EmotionResponse["timingsMs"]>> = {
  1: "normalize",
  2: "tokenize",
  4: "encoder",
  6: "classify",
};

/** The picture for steps 2 to 10. They all need the model's answer. */
function stepView(index: number, emotion: EmotionResponse, input: string, speed: number): ReactNode {
  switch (index) {
    case 1:
      return <NormalisationStep before={input} after={emotion.normalizedText} />;
    case 2:
      return <TokensStep tokens={emotion.tokens} speed={speed} />;
    case 3:
      return <EmbeddingsStep emotion={emotion} speed={speed} />;
    case 4:
      return <EncoderStep emotion={emotion} speed={speed} />;
    case 5:
      return <ClsVectorStep values={emotion.clsVectorPreview} speed={speed} />;
    case 6:
      return <LogitsStep logits={emotion.logits} speed={speed} />;
    case 7:
      return <SoftmaxStep emotion={emotion} speed={speed} />;
    case 8:
      return <PredictionStep emotion={emotion} />;
    case 9:
      return <SendStep probabilities={emotion.probabilities} />;
    default:
      return null;
  }
}

export function IndicBertPanel() {
  const stage = usePipelineStore((s) => s.stage);
  const bertStep = usePipelineStore((s) => s.bertStep);
  const emotion = usePipelineStore((s) => s.emotion);
  const error = usePipelineStore((s) => s.error);
  const input = usePipelineStore((s) => s.input.trim());
  const speed = usePipelineStore((s) => s.speed);
  const waiting = stage === "understanding" && !emotion && bertStep === 0 ? 1 : null;
  // Once VITS has the five values, every step here is finished, so only the VITS panel shows an active step.
  const handedOver =
    stage === "speaking" || stage === "playing" || stage === "done" || (stage === "error" && error?.panel === "vits");
  const current = handedOver ? BERT_STEP_COUNT : bertStep;

  return (
    <LabPanel
      id="indicbert"
      title="Understanding"
      model="IndicBERT"
      intro="Reads the sentence and works out how it feels."
      source={emotion?.source}
      steps={BERT_STEPS}
      current={current}
    >
      {error?.panel === "indicbert" && (
        <li className="w-[min(36rem,calc(100vw-5rem))] shrink-0">
          <PanelError message={error.message} />
        </li>
      )}
      {BERT_STEPS.map((step, index) => {
        const timing = STEP_TIMING[index];
        return (
          <StepCard
            key={step.title}
            id={stepId("indicbert", index)}
            number={index + 1}
            title={step.title}
            summary={step.summary}
            detail={step.detail}
            status={stepStatus(index, current, waiting)}
            arrow={index < BERT_STEPS.length - 1}
            aside={emotion && timing ? `${emotion.timingsMs[timing]} ms` : undefined}
          >
            {index === 0 ? <InputStep text={input} /> : emotion && stepView(index, emotion, input, speed)}
          </StepCard>
        );
      })}
    </LabPanel>
  );
}
