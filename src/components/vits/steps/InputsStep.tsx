import { EmotionColumns } from "@/components/ui/EmotionColumns";
import type { EmotionVector, SpeakerId } from "@/lib/api/contracts";

interface InputsStepProps {
  text: string;
  speakerId: SpeakerId;
  vector: EmotionVector;
  speed: number;
}

/** Step 1: what VITS is given. The emotion values arrive as five plain numbers. */
export function InputsStep({ text, speakerId, vector, speed }: InputsStepProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-slate">Sentence (normalised)</p>
        <p lang="ta" className="text-base text-navy">
          {text}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate">Speaker</p>
        <span className="rounded-md bg-navy px-2 py-0.5 text-sm font-medium text-white">{speakerId}</span>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-slate">Emotion probabilities (from IndicBERT)</p>
        <EmotionColumns vector={vector} speed={speed} />
      </div>
    </div>
  );
}
