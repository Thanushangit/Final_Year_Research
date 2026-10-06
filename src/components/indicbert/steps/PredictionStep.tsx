import { EMOTIONS, type Emotion, type EmotionResponse, type EmotionVector } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { hexToRgb, textColorOn } from "@/lib/colorScale";
import { EMOTION_BG, EMOTION_HEX, EMOTION_LABEL, EMOTION_TAMIL } from "@/lib/emotions";
import { formatNumber, formatPercent } from "@/lib/format";

interface VectorProps {
  probabilities: EmotionVector;
  top: Emotion;
}

/** All five probabilities as one bar that adds up to 100%. Only the big top piece is labelled inside. */
function VectorBar({ probabilities, top }: VectorProps) {
  return (
    <div aria-hidden="true" className="flex h-7 w-full gap-0.5">
      {EMOTIONS.map((emotion) => {
        const value = probabilities[emotion];
        return (
          <span
            key={emotion}
            className={cn("flex min-w-0.5 items-center first:rounded-l-[4px] last:rounded-r-[4px]", EMOTION_BG[emotion])}
            style={{ flexGrow: value, flexBasis: 0 }}
          >
            {emotion === top && value >= 0.4 && (
              <span className="px-2 text-xs font-medium whitespace-nowrap" style={{ color: textColorOn(hexToRgb(EMOTION_HEX[emotion])) }}>
                {EMOTION_LABEL[emotion]} {formatPercent(value)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function VectorList({ probabilities, top }: VectorProps) {
  return (
    <ul aria-label="The five probabilities" className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-4 gap-y-1">
      {EMOTIONS.map((emotion) => (
        <li key={emotion} className="flex items-center gap-1.5 text-sm text-navy">
          <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[2px]", EMOTION_BG[emotion])} />
          <span className={cn(emotion === top && "font-semibold")}>{EMOTION_LABEL[emotion]}</span>
          <span className={cn("ml-auto tabular-nums", emotion === top && "font-semibold")}>
            {formatNumber(probabilities[emotion], 3)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Step 9: the most likely emotion and how sure the model is, with the whole vector beside it. */
export function PredictionStep({ emotion }: { emotion: EmotionResponse }) {
  const top = emotion.predictedEmotion;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className={cn("size-3.5 rounded-full", EMOTION_BG[top])} />
        <p className="font-display text-2xl leading-tight font-semibold text-navy">{EMOTION_LABEL[top]}</p>
        <p lang="ta" className="text-lg text-slate">
          {EMOTION_TAMIL[top]}
        </p>
        <p className="ml-auto text-navy">
          <span className="text-xl font-semibold">{formatPercent(emotion.confidence)}</span> sure
        </p>
      </div>
      <VectorBar probabilities={emotion.probabilities} top={top} />
      <VectorList probabilities={emotion.probabilities} top={top} />
      <p className="rounded-md bg-mist/70 px-3 py-2 text-sm text-navy">
        <strong className="font-semibold">The full vector is sent, not only the label.</strong> VITS gets all five
        numbers, so a mix of feelings can still be heard in the voice.
      </p>
    </div>
  );
}
