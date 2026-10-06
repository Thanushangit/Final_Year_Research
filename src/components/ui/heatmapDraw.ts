// Canvas drawing for Heatmap. Two ways to draw: separate squares with gaps (small grids), or one
// scaled image with one pixel per cell (big grids such as an alignment or a spectrogram).
import { rgbCss, scaleRgb, type ScaleKind } from "@/lib/colorScale";

export interface Grid {
  values: number[][];
  rows: number;
  cols: number;
  scale: ScaleKind;
  low: number;
  high: number;
  /** Row 0 is drawn at the bottom (spectrograms: low frequencies at the bottom). */
  flipRows: boolean;
}

export interface Geometry {
  width: number;
  height: number;
  cellW: number;
  rowH: number;
}

const FADE_ROWS = 3;

const position = (grid: Grid, value: number) => (value - grid.low) / (grid.high - grid.low || 1);

/** Where a row is drawn, counting from the top. */
export const drawnRow = (grid: Pick<Grid, "rows" | "flipRows">, row: number) =>
  grid.flipRows ? grid.rows - 1 - row : row;

/** Separate squares with a thin gap; rows fade in from the top as `progress` goes from 0 to 1. */
export function drawCells(context: CanvasRenderingContext2D, grid: Grid, geometry: Geometry, progress: number) {
  const { cellW, rowH } = geometry;
  const gap = cellW >= 10 ? 2 : cellW >= 5 ? 1 : 0;
  for (let r = 0; r < grid.rows; r++) {
    const y = drawnRow(grid, r);
    const alpha = Math.min(1, Math.max(0, (progress * (grid.rows + FADE_ROWS) - y) / FADE_ROWS));
    if (alpha === 0) continue;
    context.globalAlpha = alpha;
    for (let c = 0; c < grid.cols; c++) {
      context.fillStyle = rgbCss(scaleRgb(grid.scale, position(grid, grid.values[r][c])));
      context.fillRect(c * cellW + gap / 2, y * rowH + gap / 2, cellW - gap, rowH - gap);
    }
  }
  context.globalAlpha = 1;
}

/** One pixel per cell, ready to be stretched over the canvas. */
export function renderImage(grid: Grid): HTMLCanvasElement {
  const image = document.createElement("canvas");
  image.width = Math.max(1, grid.cols);
  image.height = Math.max(1, grid.rows);
  const context = image.getContext("2d");
  if (!context) return image;
  const pixels = context.createImageData(image.width, image.height);
  for (let r = 0; r < grid.rows; r++) {
    const y = drawnRow(grid, r);
    for (let c = 0; c < grid.cols; c++) {
      const [red, green, blue] = scaleRgb(grid.scale, position(grid, grid.values[r][c]));
      const at = (y * image.width + c) * 4;
      pixels.data[at] = red;
      pixels.data[at + 1] = green;
      pixels.data[at + 2] = blue;
      pixels.data[at + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return image;
}

/** Stretches the one-pixel-per-cell image; revealed from the left ("columns") or from the top ("rows"). */
export function drawImage(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  geometry: Geometry,
  progress: number,
  reveal: "rows" | "columns",
) {
  if (progress <= 0) return;
  context.save();
  context.beginPath();
  if (reveal === "columns") context.rect(0, 0, geometry.width * progress, geometry.height);
  else context.rect(0, 0, geometry.width, geometry.height * progress);
  context.clip();
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, geometry.width, geometry.height);
  context.restore();
}

/** The outlined row, and the cell under the pointer with a faint crosshair through it. */
export function drawHighlights(
  context: CanvasRenderingContext2D,
  grid: Grid,
  geometry: Geometry,
  selectedRow: number | null,
  active: { row: number; col: number } | null,
) {
  const { width, height, cellW, rowH } = geometry;
  if (selectedRow !== null && selectedRow < grid.rows) {
    context.lineWidth = 2;
    context.strokeStyle = "#1b2e50";
    context.strokeRect(1, drawnRow(grid, selectedRow) * rowH + 1, width - 2, Math.max(2, rowH - 2));
  }
  if (!active) return;
  const x = active.col * cellW;
  const y = drawnRow(grid, active.row) * rowH;
  if (cellW < 6 || rowH < 6) {
    // Cells too small to outline: draw thin lines through the point instead.
    context.lineWidth = 1;
    context.strokeStyle = "rgba(15, 28, 51, 0.7)";
    context.beginPath();
    context.moveTo(x + cellW / 2, 0);
    context.lineTo(x + cellW / 2, height);
    context.moveTo(0, y + rowH / 2);
    context.lineTo(width, y + rowH / 2);
    context.stroke();
    return;
  }
  // A faint crosshair on the row and column, then the cell itself lifts with a dark and a white ring.
  context.lineWidth = 1;
  context.strokeStyle = "rgba(27, 46, 80, 0.45)";
  context.strokeRect(0.5, y + 0.5, width - 1, rowH - 1);
  context.strokeRect(x + 0.5, 0.5, cellW - 1, height - 1);
  context.lineWidth = 2;
  context.strokeStyle = "#0f1c33";
  context.strokeRect(x + 1, y + 1, cellW - 2, rowH - 2);
  if (cellW >= 9 && rowH >= 9) {
    context.lineWidth = 1;
    context.strokeStyle = "#ffffff";
    context.strokeRect(x + 2.5, y + 2.5, cellW - 5, rowH - 5);
  }
}
