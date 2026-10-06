"use client";

import { useMemo } from "react";
import { Heatmap } from "@/components/ui/Heatmap";
import { GradientLegend } from "@/components/ui/ScaleLegend";
import type { EmotionResponse } from "@/lib/api/contracts";
import { formatNumber } from "@/lib/format";
import { describeTokens, tokenName } from "@/lib/tokens";
import { TokenText } from "../TokenText";
import { MAX_TOKEN_ROWS } from "./shared";

/** Step 4: tokens × the first 16 of their 768 embedding numbers, blue below zero and gold above. */
export function EmbeddingsStep({ emotion, speed }: { emotion: EmotionResponse; speed: number }) {
  const count = Math.min(emotion.tokens.length, MAX_TOKEN_ROWS);
  const views = useMemo(
    () => describeTokens(emotion.tokens.map((token) => token.token)).slice(0, count),
    [emotion.tokens, count],
  );
  const values = useMemo(() => emotion.embeddingPreview.slice(0, count), [emotion.embeddingPreview, count]);
  const dimensions = values[0]?.length ?? 0;
  const all = values.flat();
  const min = Math.min(...all);
  const max = Math.max(...all);
  // A tidy limit either side of zero, so equal colours mean equal sizes above and below zero.
  const limit = Math.max(0.1, Math.ceil(Math.max(-min, max) * 10) / 10);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-navy">768 dimensions, showing {dimensions}</p>
        <GradientLegend scale="diverging" low={formatNumber(-limit, 1)} high={formatNumber(limit, 1)} />
      </div>
      <Heatmap
        values={values}
        scale="diverging"
        domain={[-limit, limit]}
        rowNames={views.map(tokenName)}
        columnNames={Array.from({ length: dimensions }, (_, i) => `Dimension ${i + 1}`)}
        renderRowLabel={(row) => <TokenText view={views[row]} className="min-w-0 truncate text-navy" />}
        axis={{ start: "dimension 1", end: String(dimensions) }}
        maxCellPx={26}
        minRowPx={18}
        revealMs={900}
        speed={speed}
        describeCell={({ row, col }, value) => (
          <>
            <TokenText view={views[row]} className="text-navy" />, dimension {col + 1}:{" "}
            <span className="text-navy tabular-nums">{formatNumber(value, 2)}</span>
          </>
        )}
        hint="Point at a square to see its number."
        label="Token embeddings: the first 16 of 768 numbers for each token"
        summary={`${count} rows, one per token, and ${dimensions} columns. The numbers run from ${formatNumber(min, 2)} to ${formatNumber(max, 2)}.`}
      />
      {emotion.tokens.length > count && (
        <p className="mt-1 text-xs text-slate">
          Showing the first {count} of {emotion.tokens.length} tokens.
        </p>
      )}
    </div>
  );
}
