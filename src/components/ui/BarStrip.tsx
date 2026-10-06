"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { SIGN_COLOR } from "@/lib/colorScale";
import { formatNumber } from "@/lib/format";

interface BarStripProps {
  /** Numbers above and below zero, such as part of a vector. */
  values: number[];
  /** Accessible name. */
  label: string;
  /** Readout for the bar under the pointer. */
  describe: (index: number, value: number) => ReactNode;
  /** Readout when no bar is pointed at. */
  hint: ReactNode;
  speed?: number;
  heightPx?: number;
  className?: string;
}

/** Thin bars going up (above zero, gold) or down (below zero, blue) from a middle line. */
export function BarStrip({ values, label, describe, hint, speed = 1, heightPx = 72, className }: BarStripProps) {
  const [hover, setHover] = useState<number | null>(null);
  const limit = Math.max(1e-6, ...values.map((value) => Math.abs(value)));
  const stagger = Math.min(0.02, 0.6 / Math.max(values.length, 1));

  return (
    <figure className={className}>
      <figcaption className="sr-only">
        {label}. Values in order: {values.map((value) => formatNumber(value, 2)).join(", ")}.
      </figcaption>
      <div
        aria-hidden="true"
        className="relative flex gap-0.5"
        style={{ height: heightPx }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setHover(null);
        }}
      >
        <span className="absolute inset-x-0 top-1/2 h-px bg-navy/30" />
        {values.map((value, index) => {
          const up = value >= 0;
          return (
            // The whole column is the pointer target, not only the painted bar.
            <span
              key={index}
              className="relative h-full min-w-0 flex-1"
              onPointerEnter={() => setHover(index)}
              onPointerDown={() => setHover(index)}
            >
              <motion.span
                className={up ? "absolute inset-x-0 bottom-1/2 rounded-t-[2px]" : "absolute inset-x-0 top-1/2 rounded-b-[2px]"}
                style={{
                  height: `${(Math.abs(value) / limit) * 50}%`,
                  backgroundColor: up ? SIGN_COLOR.positive : SIGN_COLOR.negative,
                  originY: up ? 1 : 0,
                  opacity: hover === null || hover === index ? 1 : 0.4,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4 / speed, delay: (index * stagger) / speed, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 min-h-5 text-xs text-slate">{hover === null ? hint : describe(hover, values[hover])}</p>
    </figure>
  );
}
