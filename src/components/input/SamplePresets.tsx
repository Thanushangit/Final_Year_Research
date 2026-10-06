"use client";

import { cn } from "@/lib/cn";
import { EMOTION_BG, EMOTION_LABEL } from "@/lib/emotions";
import { PRESETS } from "@/lib/mock/presets";
import { usePipelineStore } from "@/store/pipelineStore";

/** First two words, for a short chip label. */
const opening = (text: string) => `${text.split(" ").slice(0, 2).join(" ")}…`;

/** One sample sentence per emotion. A click puts it on the paper. */
export function SamplePresets() {
  const input = usePipelineStore((s) => s.input);
  const setInput = usePipelineStore((s) => s.setInput);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 id="samples-label" className="text-sm text-haze">
        Sample sentences
      </h2>
      <ul aria-labelledby="samples-label" className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const chosen = input.trim() === preset.text;
          return (
            <li key={preset.emotion}>
              <button
                type="button"
                onClick={() => setInput(preset.text)}
                aria-pressed={chosen}
                aria-label={`${EMOTION_LABEL[preset.emotion]} sample: ${preset.text}`}
                title={preset.text}
                className={cn(
                  "flex max-w-[17rem] items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-3 text-left transition-colors",
                  chosen ? "border-gold bg-ink-raised" : "border-line hover:border-gold/70",
                )}
              >
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", EMOTION_BG[preset.emotion])} />
                <span className="shrink-0 text-sm text-haze">{EMOTION_LABEL[preset.emotion]}</span>
                <span lang="ta" className="truncate text-sm">
                  {opening(preset.text)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
