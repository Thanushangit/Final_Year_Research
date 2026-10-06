"use client";

import { useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProbabilityBars } from "@/components/ui/ProbabilityBars";
import { EMOTIONS, type Emotion, type EmotionResponse } from "@/lib/api/contracts";
import { formatNumber } from "@/lib/format";
import { easeInOut, useAnimationClock } from "@/lib/useAnimationClock";
import { logitDomain, perEmotion } from "./shared";

// Each part of the animation: hold still, then move to the next picture.
const HOLD_MS = 700;
const MOVE_MS = 900;
const LEG_MS = HOLD_MS + MOVE_MS;
const TOTAL_MS = 2 * LEG_MS;

interface Picture {
  values: Record<Emotion, number>;
  domain: readonly [number, number];
  digits: number;
}

/** 0 = raw scores, 1 = e to the power of each score, 2 = probabilities. Fractions are on the way between. */
function positionAt(elapsed: number): number {
  const leg = Math.min(1, Math.floor(elapsed / LEG_MS));
  const moving = (elapsed - leg * LEG_MS - HOLD_MS) / MOVE_MS;
  return leg + easeInOut(Math.min(1, Math.max(0, moving)));
}

const lerp = (from: number, to: number, f: number) => from + (to - from) * f;

/** Step 8: the raw scores turn into probabilities, in the two steps softmax really takes. */
export function SoftmaxStep({ emotion, speed }: { emotion: EmotionResponse; speed: number }) {
  const [run, setRun] = useState(0);
  const elapsed = useAnimationClock(TOTAL_MS, { speed, runKey: run });
  // With reduced motion the result shows at once, so there is nothing to play again.
  const reduceMotion = useReducedMotion();

  const { pictures, total } = useMemo(() => {
    const powers = perEmotion((e) => Math.exp(emotion.logits[e]));
    const largest = Math.max(...EMOTIONS.map((e) => powers[e]));
    const list: Picture[] = [
      { values: emotion.logits, domain: logitDomain(emotion.logits), digits: 2 },
      { values: powers, domain: [0, Math.ceil(largest)], digits: 2 },
      { values: emotion.probabilities, domain: [0, 1], digits: 3 },
    ];
    return { pictures: list, total: EMOTIONS.reduce((sum, e) => sum + powers[e], 0) };
  }, [emotion]);

  const position = positionAt(elapsed);
  const from = Math.min(1, Math.floor(position));
  const f = position - from;
  const [a, b] = [pictures[from], pictures[from + 1]];
  const values = perEmotion((e) => lerp(a.values[e], b.values[e], f));
  const domain = [lerp(a.domain[0], b.domain[0], f), lerp(a.domain[1], b.domain[1], f)] as const;
  const shown = Math.round(position);
  const digits = pictures[shown].digits;
  const finished = elapsed >= TOTAL_MS;

  const captions = [
    "Start: the raw scores from step 7.",
    "Raise e to the power of each score, so every value is positive.",
    `Divide each one by their total (${formatNumber(total, 2)}). Now they add up to 1.`,
  ];

  return (
    <div>
      <p className="mb-2 min-h-10 text-sm font-medium text-navy">{captions[shown]}</p>
      <ProbabilityBars
        values={values}
        domain={domain}
        digits={digits}
        highlight={finished ? emotion.predictedEmotion : null}
        label="Each emotion's value as the scores turn into probabilities"
      />
      <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
        <p className="text-xs text-slate tabular-nums">
          {shown > 0 && `Total ${formatNumber(EMOTIONS.reduce((sum, e) => sum + values[e], 0), digits)}`}
        </p>
        {finished && !reduceMotion && (
          <Button size="sm" variant="secondaryLight" onClick={() => setRun((value) => value + 1)}>
            Play again
          </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-navy">
        probability = e<sup>score</sup> ÷ (e<sup>score</sup> of all five, added up)
      </p>
    </div>
  );
}
