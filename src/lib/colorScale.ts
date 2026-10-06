// Colour scales for the charts. Colours are mixed in OKLab, so lightness changes evenly along a scale.

export type Rgb = readonly [number, number, number];
type Lab = readonly [number, number, number];

/**
 * sequential: how much (light grey-blue to navy), for values that start at zero.
 * diverging: which side of zero (blue below, grey at zero, gold above).
 */
export type ScaleKind = "sequential" | "diverging";

/** The two ends of the diverging scale. Both have at least 3:1 contrast on white and on the gold-soft highlight. */
export const SIGN_COLOR = { negative: "#44648f", positive: "#93700f" } as const;

const STOPS: Record<ScaleKind, ReadonlyArray<readonly [position: number, hex: string]>> = {
  sequential: [
    [0, "#eef2f8"],
    [0.5, "#6b80a3"],
    [1, "#1b2e50"],
  ],
  diverging: [
    [0, SIGN_COLOR.negative],
    [0.5, "#f2f3f5"],
    [0.8, "#c9a227"],
    [1, SIGN_COLOR.positive],
  ],
};

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (c: number) => {
  const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
};

function rgbToOklab([r, g, b]: Rgb): Lab {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const LUT_SIZE = 256;
const lookupTables: Partial<Record<ScaleKind, Rgb[]>> = {};

/** 256 ready-mixed colours per scale, so drawing a heatmap is only a table lookup per cell. */
function buildTable(kind: ScaleKind): Rgb[] {
  const stops = STOPS[kind].map(([position, hex]) => [position, rgbToOklab(hexToRgb(hex))] as const);
  return Array.from({ length: LUT_SIZE }, (_, i) => {
    const t = i / (LUT_SIZE - 1);
    let k = 1;
    while (k < stops.length - 1 && t > stops[k][0]) k++;
    const [startAt, from] = stops[k - 1];
    const [endAt, to] = stops[k];
    const f = endAt === startAt ? 0 : (t - startAt) / (endAt - startAt);
    return oklabToRgb([from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f, from[2] + (to[2] - from[2]) * f]);
  });
}

/** Colour at position t (0 to 1) along a scale. On the diverging scale 0.5 means zero. */
export function scaleRgb(kind: ScaleKind, t: number): Rgb {
  const table = (lookupTables[kind] ??= buildTable(kind));
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  return table[Math.round(clamped * (LUT_SIZE - 1))];
}

export const rgbCss = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

export const scaleColor = (kind: ScaleKind, t: number) => rgbCss(scaleRgb(kind, t));

/** A CSS gradient of the whole scale, for legends. */
export function scaleGradient(kind: ScaleKind): string {
  const samples = Array.from({ length: 9 }, (_, i) => `${scaleColor(kind, i / 8)} ${(i / 8) * 100}%`);
  return `linear-gradient(to right, ${samples.join(", ")})`;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const NAVY_TEXT = "#1b2e50";
const NAVY_LUMINANCE = luminance(hexToRgb(NAVY_TEXT));

/** Navy or white, whichever has more contrast on this background. */
export function textColorOn(background: Rgb): string {
  const y = luminance(background);
  const onWhite = 1.05 / (y + 0.05);
  const onNavy = (y + 0.05) / (NAVY_LUMINANCE + 0.05);
  return onNavy >= onWhite ? NAVY_TEXT : "#ffffff";
}
