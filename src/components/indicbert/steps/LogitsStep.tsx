import { ProbabilityBars } from "@/components/ui/ProbabilityBars";
import type { EmotionScores } from "@/lib/api/contracts";
import { logitDomain } from "./shared";

/** Step 7: the classifier's raw score for each emotion. */
export function LogitsStep({ logits, speed }: { logits: EmotionScores; speed: number }) {
  return (
    <div>
      <ProbabilityBars values={logits} domain={logitDomain(logits)} digits={2} grow speed={speed} label="Raw score for each emotion" />
      <p className="mt-3 text-xs text-slate">
        Raw scores (logits) can be any size, even below zero. Higher means more likely, but they do not add up to
        anything yet.
      </p>
    </div>
  );
}
