"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ScaleKind } from "@/lib/colorScale";
import { formatNumber } from "@/lib/format";
import { langOf } from "@/lib/tokens";
import { useAnimationClock } from "@/lib/useAnimationClock";
import { drawCells, drawHighlights, drawImage, drawnRow, renderImage, type Grid } from "./heatmapDraw";

export interface HeatmapCell {
  row: number;
  col: number;
}

interface HeatmapProps {
  /** Rows × columns. */
  values: number[][];
  scale: ScaleKind;
  /** The values at the two ends of the colour scale. */
  domain: readonly [number, number];
  /** Plain-text names for the rows and columns (used by the screen-reader table). */
  rowNames: string[];
  columnNames: string[];
  /** What to show at the left of each row. Hidden when the rows get too thin to read. */
  renderRowLabel?: (row: number) => ReactNode;
  /** Text under the first and last column, such as "dimension 1" and "16". */
  axis?: { start: ReactNode; end: ReactNode };
  /** Square cells (token × token); otherwise the grid fills the width. */
  square?: boolean;
  maxCellPx?: number;
  /** Rows stay at least this tall so their labels can be read (not used with square cells). */
  minRowPx?: number;
  /**
   * Big grids: fill the width at this height and draw the cells as one stretched image
   * (cells may be thinner than a pixel). No row labels in this mode.
   */
  fixedHeightPx?: number;
  /** Row 0 is drawn at the bottom (spectrograms: low frequencies at the bottom). */
  flipRows?: boolean;
  /** How the grid appears: rows fade in from the top, or columns sweep in from the left. */
  reveal?: "rows" | "columns";
  /** 0 shows it at once. */
  revealMs?: number;
  revealDelayMs?: number;
  speed?: number;
  /** A row that stays outlined, such as the token being studied. */
  selectedRow?: number | null;
  onHoverCell?: (cell: HeatmapCell | null) => void;
  /** Readout for the cell under the pointer. */
  describeCell: (cell: HeatmapCell, value: number) => ReactNode;
  /** Readout when no cell is pointed at. */
  hint: ReactNode;
  /** Accessible name, and a sentence describing the pattern for screen readers. */
  label: string;
  summary: string;
  className?: string;
}

const LABEL_WIDTH = 88;
const LABEL_GAP = 8;
const MIN_LABEL_ROW = 11;
/** Above this many cells the screen-reader table is left out; the summary still describes the map. */
const MAX_TABLE_CELLS = 1200;

function fitCells(space: number, rows: number, cols: number, square: boolean, maxCell: number, minRow: number) {
  const fit = cols > 0 && rows > 0 ? Math.max(0, Math.floor(space / cols)) : 0;
  const cellW = Math.min(fit, maxCell);
  const rowH = square ? cellW : Math.min(maxCell, Math.max(minRow, cellW));
  return { cellW, rowH };
}

/** A grid of coloured cells drawn on a canvas, with labels, a hover readout and a screen-reader table. */
export function Heatmap({
  values,
  scale,
  domain,
  rowNames,
  columnNames,
  renderRowLabel,
  axis,
  square = false,
  maxCellPx = 28,
  minRowPx = 16,
  fixedHeightPx,
  flipRows = false,
  reveal = "rows",
  revealMs = 700,
  revealDelayMs = 0,
  speed = 1,
  selectedRow = null,
  onHoverCell,
  describeCell,
  hint,
  label,
  summary,
  className,
}: HeatmapProps) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<{ values: number[][]; key: string; image: HTMLCanvasElement } | null>(null);
  const lastHover = useRef<HeatmapCell | null>(null);
  const [outerWidth, setOuterWidth] = useState(0);
  const [hover, setHover] = useState<HeatmapCell | null>(null);
  const elapsed = useAnimationClock(revealDelayMs + revealMs, { speed });
  const progress = revealMs > 0 ? Math.min(1, Math.max(0, (elapsed - revealDelayMs) / revealMs)) : 1;

  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const dense = fixedHeightPx !== undefined;
  // Sized from the outer width only, so showing or hiding the labels can never resize the grid in a loop.
  const withLabels = fitCells(outerWidth - LABEL_WIDTH - LABEL_GAP, rows, cols, square, maxCellPx, minRowPx);
  const showLabels = !dense && Boolean(renderRowLabel) && withLabels.rowH >= MIN_LABEL_ROW;
  const fitted = showLabels ? withLabels : fitCells(outerWidth, rows, cols, square, maxCellPx, minRowPx);
  const cellW = dense ? (cols > 0 ? outerWidth / cols : 0) : fitted.cellW;
  const rowH = dense ? (rows > 0 ? fixedHeightPx / rows : 0) : fitted.rowH;
  const width = dense ? outerWidth : cellW * cols;
  const height = dense ? fixedHeightPx : rowH * rows;
  const [low, high] = domain;
  const active = hover && hover.row < rows && hover.col < cols ? hover : null;

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new ResizeObserver(([entry]) => setOuterWidth(entry.contentRect.width));
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || width <= 0 || height <= 0) return;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const grid: Grid = { values, rows, cols, scale, low, high, flipRows };
    const geometry = { width, height, cellW, rowH };
    if (dense) {
      // The image only changes with the data, not on every animation frame.
      const key = `${scale}|${low}|${high}|${flipRows}`;
      if (imageRef.current?.values !== values || imageRef.current.key !== key) {
        imageRef.current = { values, key, image: renderImage(grid) };
      }
      drawImage(context, imageRef.current.image, geometry, progress, reveal);
    } else {
      drawCells(context, grid, geometry, progress);
    }
    drawHighlights(context, grid, geometry, selectedRow, active);
  }, [values, scale, low, high, flipRows, dense, reveal, width, height, cellW, rowH, rows, cols, progress, active, selectedRow]);

  const cellAt = (event: PointerEvent<HTMLCanvasElement>): HeatmapCell | null => {
    const box = event.currentTarget.getBoundingClientRect();
    const col = Math.floor((event.clientX - box.left) / cellW);
    const y = Math.floor((event.clientY - box.top) / rowH);
    if (y < 0 || y >= rows || col < 0 || col >= cols) return null;
    // drawnRow works both ways: it turns a drawn row back into a data row too.
    return { row: drawnRow({ rows, flipRows }, y), col };
  };

  const updateHover = (cell: HeatmapCell | null) => {
    const previous = lastHover.current;
    if (previous?.row === cell?.row && previous?.col === cell?.col) return;
    lastHover.current = cell;
    setHover(cell);
    onHoverCell?.(cell);
  };

  return (
    <figure ref={figureRef} className={cn("min-w-0", className)}>
      <figcaption className="sr-only">
        {label}. {summary}
      </figcaption>
      <div className="flex items-start" style={{ gap: LABEL_GAP }}>
        {showLabels && (
          <div
            className="grid shrink-0"
            style={{ width: LABEL_WIDTH, gridAutoRows: `${rowH}px`, fontSize: Math.min(13, Math.max(10, Math.round(rowH * 0.7))) }}
          >
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex min-w-0 items-center justify-end">
                {renderRowLabel?.(row)}
              </div>
            ))}
          </div>
        )}
        <div className="min-w-0">
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="block"
            style={{ width, height }}
            onPointerMove={(event) => updateHover(cellAt(event))}
            onPointerDown={(event) => updateHover(cellAt(event))}
            onPointerLeave={(event) => {
              // A finger has no hover, so a tapped cell stays shown.
              if (event.pointerType !== "touch") updateHover(null);
            }}
          />
          {axis && (
            <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] text-slate tabular-nums" style={{ width }}>
              <span>{axis.start}</span>
              <span>{axis.end}</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-1.5 min-h-5 text-xs text-slate">
        {active ? describeCell(active, values[active.row][active.col]) : hint}
      </p>
      {rows * cols <= MAX_TABLE_CELLS && (
        <table className="sr-only">
          <caption>{label}</caption>
          <thead>
            <tr>
              <td />
              {columnNames.map((name, col) => (
                <th key={col} scope="col" lang={langOf(name)}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, r) => (
              <tr key={r}>
                <th scope="row" lang={langOf(rowNames[r] ?? "")}>
                  {rowNames[r]}
                </th>
                {row.map((value, c) => (
                  <td key={c}>{formatNumber(value, 2)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
