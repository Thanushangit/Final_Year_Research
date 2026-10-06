"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { BarStrip } from "@/components/ui/BarStrip";
import { EmotionColumns } from "@/components/ui/EmotionColumns";
import { SPEAKER_IDS, type EmotionVector, type SpeakerId } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

const TARGETS = ["Text encoder", "Duration predictor", "Decoder"] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 10" className="h-2.5 w-4 shrink-0 text-slate">
      <path d="M1 5h13M10 1.5 14 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface LaneProps {
  title: string;
  /** Lane colour: navy for the voice, gold for the feeling. */
  tone: "speaker" | "emotion";
  delay: number;
  children: ReactNode;
}

function Lane({ title, tone, delay, children }: LaneProps) {
  return (
    <motion.section
      aria-label={title}
      className={cn("border-l-[3px] pl-3", tone === "speaker" ? "border-navy" : "border-gold")}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <h4 className="mb-1.5 text-sm font-medium text-navy">{title}</h4>
      {children}
    </motion.section>
  );
}

/** The speaker table: one learned row per speaker; the chosen speaker's row is looked up. */
function SpeakerTable({ selected }: { selected: SpeakerId }) {
  return (
    <ul aria-label="Speaker table" className="grid shrink-0 gap-0.5">
      {SPEAKER_IDS.map((id) => (
        <li
          key={id}
          className={cn(
            "rounded-sm px-1.5 text-[11px] leading-4 tabular-nums",
            id === selected ? "bg-navy font-medium text-white" : "bg-mist text-slate",
          )}
        >
          {id}
        </li>
      ))}
    </ul>
  );
}

interface ConditioningStepProps {
  speakerId: SpeakerId;
  vector: EmotionVector;
  speakerEmbedding: number[];
  emotionEmbedding: number[];
  speed: number;
}

/** Step 3: two separate lanes, one for the voice and one for the feeling. They never merge. */
export function ConditioningStep({ speakerId, vector, speakerEmbedding, emotionEmbedding, speed }: ConditioningStepProps) {
  const describe = (index: number, value: number, total: number) => (
    <>
      Number {index + 1} of the {total} shown: <span className="text-navy tabular-nums">{formatNumber(value, 3)}</span>
    </>
  );

  return (
    <div className="space-y-4">
      <Lane title="Speaker embedding" tone="speaker" delay={0}>
        <div className="flex items-center gap-2">
          <SpeakerTable selected={speakerId} />
          <Arrow />
          <BarStrip
            className="min-w-0 flex-1"
            values={speakerEmbedding}
            heightPx={44}
            speed={speed}
            label={`Speaker embedding for ${speakerId}`}
            describe={(i, v) => describe(i, v, speakerEmbedding.length)}
            hint={`Row ${speakerId}, looked up from a learned table.`}
          />
        </div>
      </Lane>
      <Lane title="Emotion embedding" tone="emotion" delay={0.35 / speed}>
        <div className="flex items-center gap-2">
          <EmotionColumns vector={vector} compact speed={speed} />
          <Arrow />
          <span className="shrink-0 rounded-md border border-mist bg-panel px-1.5 py-1 text-center text-[11px] leading-tight text-navy">
            Linear
            <br />
            layer
          </span>
          <Arrow />
          <BarStrip
            className="min-w-0 flex-1"
            values={emotionEmbedding}
            heightPx={44}
            speed={speed}
            label="Emotion embedding made from the five probabilities"
            describe={(i, v) => describe(i, v, emotionEmbedding.length)}
            hint="Made from all five probabilities by a learned linear layer."
          />
        </div>
      </Lane>
      <div>
        <p className="text-xs text-slate">Both vectors go, side by side, to:</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {TARGETS.map((target) => (
            <li key={target} className="inline-flex items-center gap-1.5 rounded-md border border-mist bg-panel px-2 py-1 text-sm text-navy">
              <span aria-hidden="true" className="flex gap-0.5">
                <span className="size-2 rounded-[2px] bg-navy" />
                <span className="size-2 rounded-[2px] bg-gold" />
              </span>
              {target}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm font-medium text-navy">Kept separate so the model does not confuse a voice with a feeling.</p>
    </div>
  );
}
