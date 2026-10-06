"use client";

import { useMemo, useState } from "react";
import { Heatmap } from "@/components/ui/Heatmap";
import { GradientLegend } from "@/components/ui/ScaleLegend";
import type { EmotionResponse } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { rgbCss, scaleRgb, textColorOn } from "@/lib/colorScale";
import { formatNumber, formatPercent } from "@/lib/format";
import { describeTokens, tokenName, type TokenView } from "@/lib/tokens";
import { TokenText } from "../TokenText";
import { MAX_TOKEN_ROWS } from "./shared";

interface TargetsProps {
  views: TokenView[];
  weights: number[];
  max: number;
  selected: number;
}

/** The chosen token's row written out: every token shaded by how much it is looked at, top three with numbers. */
function AttentionTargets({ views, weights, max, selected }: TargetsProps) {
  const top = weights
    .map((weight, index) => ({ weight, index }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  const topIndexes = new Set(top.map(({ index }) => index));

  return (
    <div>
      <p className="sr-only">
        {tokenName(views[selected])} looks most at{" "}
        {top.map(({ weight, index }) => `${tokenName(views[index])} ${formatPercent(weight)}`).join(", ")}.
      </p>
      <ol aria-hidden="true" className="flex flex-wrap gap-1">
        {views.map((view, index) => {
          const background = scaleRgb("sequential", weights[index] / max);
          return (
            <li
              key={index}
              className={cn("rounded px-1.5 text-[13px] leading-[22px]", index === selected && "ring-2 ring-navy ring-offset-1")}
              style={{ backgroundColor: rgbCss(background), color: textColorOn(background) }}
            >
              <TokenText view={view} />
              {topIndexes.has(index) && <span className="ml-1 text-xs tabular-nums">{formatPercent(weights[index])}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface AttentionMapProps {
  emotion: EmotionResponse;
  speed: number;
  /** Waits for the layer animation before the map fades in. */
  revealDelayMs: number;
}

/** The last layer's attention, token × token. Point at a token (or a square) to see what it looks at. */
export function AttentionMap({ emotion, speed, revealDelayMs }: AttentionMapProps) {
  const count = Math.min(emotion.tokens.length, MAX_TOKEN_ROWS);
  const views = useMemo(
    () => describeTokens(emotion.tokens.map((token) => token.token)).slice(0, count),
    [emotion.tokens, count],
  );
  const matrix = useMemo(
    () => emotion.attention.slice(0, count).map((row) => row.slice(0, count)),
    [emotion.attention, count],
  );
  const max = useMemo(() => Math.max(1e-6, ...matrix.flat()), [matrix]);
  const names = views.map(tokenName);
  // Start on [CLS]: its row is what becomes the sentence summary in the next step.
  const [selected, setSelected] = useState(0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-navy">Attention in the last layer</p>
        <GradientLegend scale="sequential" low="0" high={formatNumber(max, 2)} />
      </div>
      <Heatmap
        square
        values={matrix}
        scale="sequential"
        domain={[0, max]}
        maxCellPx={22}
        rowNames={names}
        columnNames={names}
        renderRowLabel={(row) => (
          <button
            type="button"
            aria-pressed={row === selected}
            aria-label={`Show what ${names[row]} looks at`}
            onClick={() => setSelected(row)}
            onPointerEnter={() => setSelected(row)}
            onFocus={() => setSelected(row)}
            className={cn(
              "flex h-full max-w-full min-w-0 items-center rounded-sm px-1",
              row === selected ? "bg-gold text-ink" : "text-navy hover:bg-mist",
            )}
          >
            <TokenText view={views[row]} className="min-w-0 truncate" />
          </button>
        )}
        selectedRow={selected}
        onHoverCell={(cell) => {
          if (cell) setSelected(cell.row);
        }}
        revealMs={800}
        revealDelayMs={revealDelayMs}
        speed={speed}
        describeCell={({ row, col }, value) => (
          <>
            <TokenText view={views[row]} className="text-navy" /> looks at <TokenText view={views[col]} className="text-navy" />:{" "}
            <span className="text-navy tabular-nums">{formatPercent(value)}</span>
          </>
        )}
        hint={
          <>
            What <TokenText view={views[selected]} className="font-semibold text-navy" /> looks at:
          </>
        }
        label="Attention between the tokens in the last layer, averaged over 12 heads"
        summary={`Each row shows how one token spreads its attention over all ${count} tokens and adds up to 1.`}
      />
      <AttentionTargets views={views} weights={matrix[selected]} max={max} selected={selected} />
      {emotion.tokens.length > count && (
        <p className="mt-1 text-xs text-slate">
          Showing the first {count} of {emotion.tokens.length} tokens.
        </p>
      )}
    </div>
  );
}
