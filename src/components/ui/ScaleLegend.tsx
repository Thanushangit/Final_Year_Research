import type { ReactNode } from "react";
import { SIGN_COLOR, scaleGradient, type ScaleKind } from "@/lib/colorScale";

/** A small colour bar with the values at each end, for a heatmap. */
export function GradientLegend({ scale, low, high }: { scale: ScaleKind; low: ReactNode; high: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate tabular-nums">
      <span>{low}</span>
      <span aria-hidden="true" className="h-2 w-16 rounded-[2px]" style={{ backgroundImage: scaleGradient(scale) }} />
      <span>{high}</span>
    </span>
  );
}

/** Two swatches: blue for numbers below zero, gold for numbers above zero. */
export function SignLegend() {
  return (
    <span className="inline-flex items-center gap-3 text-xs text-slate">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: SIGN_COLOR.negative }} />
        below zero
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ backgroundColor: SIGN_COLOR.positive }} />
        above zero
      </span>
    </span>
  );
}
