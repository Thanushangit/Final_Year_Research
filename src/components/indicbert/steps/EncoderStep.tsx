"use client";

import type { EmotionResponse } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { useAnimationClock } from "@/lib/useAnimationClock";
import { AttentionMap } from "./AttentionMap";

const LAYERS = 12;
const LAYER_MS = 150;
const SWEEP_MS = LAYERS * LAYER_MS;

/** Twelve slabs, bottom to top. Finished layers are navy, the one working now is gold. */
function LayerStack({ current }: { current: number }) {
  return (
    <div aria-hidden="true" className="flex w-14 shrink-0 flex-col-reverse gap-[2px]">
      {Array.from({ length: LAYERS }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[2px] rounded-[1px] transition-colors duration-150",
            i + 1 < current ? "bg-navy" : i + 1 === current ? "bg-gold" : "bg-mist",
          )}
          // Each slab sits a little to the right of the one below, so the pile reads as a stack.
          style={{ transform: `translateX(${i * 0.75}px)` }}
        />
      ))}
    </div>
  );
}

/** Step 5: the token vectors pass up through 12 layers, then the last layer's attention map appears. */
export function EncoderStep({ emotion, speed }: { emotion: EmotionResponse; speed: number }) {
  const elapsed = useAnimationClock(SWEEP_MS, { speed });
  const finished = elapsed >= SWEEP_MS;
  const layer = Math.min(LAYERS, Math.floor(elapsed / LAYER_MS) + 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <LayerStack current={finished ? LAYERS + 1 : layer} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy tabular-nums">
            {finished ? "All 12 layers done" : `Layer ${layer} of 12`}
          </p>
          <p className="text-xs text-slate">12 attention heads in every layer</p>
        </div>
      </div>
      <AttentionMap emotion={emotion} speed={speed} revealDelayMs={SWEEP_MS} />
    </div>
  );
}
