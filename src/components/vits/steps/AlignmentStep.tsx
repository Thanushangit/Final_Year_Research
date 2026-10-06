"use client";

import { useMemo } from "react";
import { Heatmap } from "@/components/ui/Heatmap";
import { langOf } from "@/lib/tokens";
import { formatSeconds, frameMs, symbolName } from "./shared";

interface AlignmentStepProps {
  symbols: string[];
  durations: number[];
  /** Symbols × frames (long outputs arrive with several frames per column). */
  alignment: number[][];
  sampleRate: number;
  speed: number;
}

/** Step 6: characters (top to bottom) against time (left to right). The path sweeps in from the left. */
export function AlignmentStep({ symbols, durations, alignment, sampleRate, speed }: AlignmentStepProps) {
  const rows = alignment.length;
  const cols = alignment[0]?.length ?? 0;
  const totalFrames = durations.reduce((sum, frames) => sum + frames, 0);
  const secondsPerColumn = ((totalFrames / Math.max(cols, 1)) * frameMs(sampleRate)) / 1000;
  const seconds = cols * secondsPerColumn;
  // For each column, the character being spoken at that moment.
  const speaking = useMemo(
    () =>
      Array.from({ length: cols }, (_, c) => {
        let best = 0;
        for (let r = 1; r < rows; r++) if (alignment[r][c] > alignment[best][c]) best = r;
        return best;
      }),
    [alignment, rows, cols],
  );

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-navy">
        {rows} characters × {totalFrames} frames
      </p>
      <Heatmap
        values={alignment}
        scale="sequential"
        domain={[0, 1]}
        fixedHeightPx={Math.min(220, Math.max(120, rows * 3))}
        reveal="columns"
        revealMs={1800}
        speed={speed}
        rowNames={symbols.map(symbolName)}
        columnNames={[]}
        axis={{ start: "0 s", end: formatSeconds(seconds) }}
        describeCell={({ col }) => {
          const row = speaking[col];
          return (
            <>
              At {(col * secondsPerColumn).toFixed(2)} s the voice is on{" "}
              <span lang={langOf(symbols[row] ?? "")} className="text-navy">
                {symbolName(symbols[row] ?? "")}
              </span>{" "}
              (character {row + 1} of {rows})
            </>
          );
        }}
        hint="First character at the top, time runs left to right. Dark squares: the character being spoken."
        label="Alignment of characters to time"
        summary={`${rows} characters spread over ${totalFrames} frames (${formatSeconds(seconds)}). The path runs from the top left to the bottom right.`}
      />
    </div>
  );
}
