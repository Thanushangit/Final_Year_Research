"use client";

import { motion } from "motion/react";
import { EMOTIONS, type EmotionVector } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { EMOTION_BG, EMOTION_LABEL } from "@/lib/emotions";
import { formatNumber } from "@/lib/format";

interface EmotionColumnsProps {
  vector: EmotionVector;
  /** Small bars only (the names and numbers are shown elsewhere and read out to screen readers). */
  compact?: boolean;
  speed?: number;
  className?: string;
}

/** The five probabilities as small upright bars in the emotion colours, tallest = most likely. */
export function EmotionColumns({ vector, compact = false, speed = 1, className }: EmotionColumnsProps) {
  const barHeight = compact ? 28 : 44;
  return (
    <ul
      aria-label="Emotion probabilities"
      className={cn(compact ? "flex items-end gap-1" : "grid grid-cols-5 gap-1.5", className)}
    >
      {EMOTIONS.map((emotion, index) => (
        <li key={emotion} className="flex min-w-0 flex-col items-center">
          <span aria-hidden="true" className="relative flex w-full justify-center" style={{ height: barHeight }}>
            <motion.span
              className={cn("absolute bottom-0 rounded-t-[3px]", EMOTION_BG[emotion], compact ? "w-1.5" : "w-5")}
              style={{ height: Math.max(2, vector[emotion] * barHeight), originY: 1 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.45 / speed, delay: (index * 0.06) / speed, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          {compact ? (
            <span className="sr-only">
              {EMOTION_LABEL[emotion]} {formatNumber(vector[emotion], 2)}
            </span>
          ) : (
            <>
              <span className="mt-1 text-xs text-navy tabular-nums">{formatNumber(vector[emotion], 2)}</span>
              <span className="max-w-full truncate text-[11px] text-slate">{EMOTION_LABEL[emotion]}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
