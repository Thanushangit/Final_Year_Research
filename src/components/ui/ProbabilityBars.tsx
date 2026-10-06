"use client";

import { motion } from "motion/react";
import { EMOTIONS, type Emotion } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { EMOTION_BG, EMOTION_LABEL } from "@/lib/emotions";
import { formatNumber } from "@/lib/format";

interface ProbabilityBarsProps {
  /** One number per emotion: raw scores (can be negative) or probabilities. */
  values: Record<Emotion, number>;
  /** The axis range. It always includes 0, so every bar grows from the zero line. */
  domain: readonly [number, number];
  digits: number;
  /** Bars grow out of the zero line when they first appear. */
  grow?: boolean;
  speed?: number;
  /** This emotion's name is drawn in bold (the prediction). */
  highlight?: Emotion | null;
  label: string;
  className?: string;
}

// Label column, gap, bar track, gap, number column. The zero line uses the same sizes to find the track.
const LABEL_REM = 5.25;
const VALUE_REM = 3.25;
const GAP_REM = 0.625;

/** Five horizontal bars in the emotion colours, with the number for each in a lined-up column. */
export function ProbabilityBars({
  values,
  domain,
  digits,
  grow = false,
  speed = 1,
  highlight = null,
  label,
  className,
}: ProbabilityBarsProps) {
  const low = Math.min(domain[0], 0);
  const high = Math.max(domain[1], 0);
  const span = high - low || 1;
  const zero = -low / span;
  const track = `(100% - ${LABEL_REM + VALUE_REM + 2 * GAP_REM}rem)`;

  return (
    <div className={cn("relative", className)}>
      <ul aria-label={label} className="grid gap-1.5">
        {EMOTIONS.map((emotion, index) => {
          const value = values[emotion];
          const end = (Math.min(Math.max(value, low), high) - low) / span;
          const negative = value < 0;
          return (
            <li
              key={emotion}
              className="grid items-center"
              style={{ gridTemplateColumns: `${LABEL_REM}rem minmax(0, 1fr) ${VALUE_REM}rem`, columnGap: `${GAP_REM}rem` }}
            >
              <span className={cn("truncate text-sm text-navy", highlight === emotion && "font-semibold")}>
                {EMOTION_LABEL[emotion]}
              </span>
              <span className="relative h-3.5">
                <motion.span
                  className={cn("absolute inset-y-0", EMOTION_BG[emotion], negative ? "rounded-l-[4px]" : "rounded-r-[4px]")}
                  style={{
                    left: `${Math.min(zero, end) * 100}%`,
                    width: `${Math.abs(end - zero) * 100}%`,
                    originX: negative ? 1 : 0,
                  }}
                  initial={grow ? { scaleX: 0 } : false}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5 / speed, delay: (index * 0.07) / speed, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className={cn("text-right text-sm text-navy tabular-nums", highlight === emotion && "font-semibold")}>
                {formatNumber(value, digits)}
              </span>
            </li>
          );
        })}
      </ul>
      {/* The zero line, drawn once across all five tracks. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-1 w-px bg-navy/40"
        style={{ left: `calc(${LABEL_REM + GAP_REM}rem + ${track} * ${zero})` }}
      />
    </div>
  );
}
