"use client";

import { EMOTIONS, type EmotionVector } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";

/** Step 10: exactly what crosses over to VITS (the packet animation carries it across the stage). */
export function SendStep({ probabilities }: { probabilities: EmotionVector }) {
  const stage = usePipelineStore((s) => s.stage);
  const vitsFailed = usePipelineStore((s) => s.error?.panel === "vits");
  const arrived = stage === "speaking" || stage === "playing" || stage === "done";
  // Written out in the fixed emotion order, the way it appears in the request to /api/tts.
  const ordered = Object.fromEntries(EMOTIONS.map((emotion) => [emotion, probabilities[emotion]]));

  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-md bg-ink px-3 py-2.5 font-mono text-xs leading-relaxed text-chalk">
        <code>{`"emotionVector": ${JSON.stringify(ordered, null, 2)}`}</code>
      </pre>
      <p className="flex items-center gap-2 text-sm text-navy">
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            vitsFailed ? "bg-emotion-anger" : arrived ? "bg-navy" : "animate-pulse bg-gold",
          )}
        />
        {vitsFailed
          ? "Sent, but the speech model did not answer. See the Speaking panel."
          : arrived
            ? "VITS has received the five values."
            : "On the way to VITS…"}
      </p>
    </div>
  );
}
