"use client";

import { Button } from "@/components/ui/Button";
import { SampleDataBadge } from "@/components/ui/SampleDataBadge";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";

export function AppHeader() {
  const backend = usePipelineStore((s) => s.backend);
  const stage = usePipelineStore((s) => s.stage);
  const reset = usePipelineStore((s) => s.reset);
  const onStage = stage !== "idle";

  return (
    <header className="sticky top-0 z-40 flex h-(--header-h) shrink-0 items-center justify-between gap-4 border-b border-line bg-ink px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="font-display text-lg font-semibold whitespace-nowrap">Reading Room</h1>
        <p className="hidden truncate text-sm text-haze sm:block">Emotion-aware Sri Lankan Tamil text-to-speech</p>
      </div>
      <div className="flex items-center gap-3">
        {/* On phones the panels carry their own badges, so the header keeps room for the button. */}
        {backend === "mock" && <SampleDataBadge className={cn(onStage && "hidden md:inline-flex")} />}
        {onStage && (
          <Button size="sm" onClick={reset} className="md:hidden">
            Try another sentence
          </Button>
        )}
      </div>
    </header>
  );
}
