// Eyelids: a ring of skin around the almond-shaped opening, built in angles around the eyeball. Building
// it ring by ring from the opening's edge keeps the lid edge perfectly smooth. The outer rings dip just
// under the face's skin, so the line where they meet reads as the eyelid crease.
// Shape changes: the upper lid slides down (blink), the lower lid slides up, and the upper lid lifts (wide eyes).
import { eyePoint, openingEdges, OPENING } from "./eyeShape";
import { FACE } from "./landmarks";

export const LID_MORPHS = ["upperClose", "lowerClose", "upperWide"] as const;
export type LidMorph = (typeof LID_MORPHS)[number];

export interface LidMeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  morphs: Record<LidMorph, Float32Array>;
}

const E = FACE.eye;
const POINTS = 112; // around the opening
const RINGS = 13; // from the lid edge outwards

/** Where the lids meet when closed: a little below the corner line. */
const CLOSED_UPPER = -0.1;
const CLOSED_LOWER = -0.11;

/** Height of each ring above the eyeball (m): a rounded edge, full lid skin, then dipping under the face. */
const LIFT = [0.0005, 0.00095, 0.0011, 0.0011, 0.0011, 0.0011, 0.00105, 0.00098, 0.0009, 0.0008, 0.00068, 0.00058, 0.00048];
/** How far each ring sits from the opening's edge (radians). The first one curls in a little. */
const ringOffset = (k: number) => (k === 0 ? -0.012 : 0.03 * k ** 1.2);

/**
 * Lid positions with the opening's upper and lower edges at the given heights. `follow` says how much
 * each ring moves with the edge (the outer rings, under the face's skin, stay put).
 */
function lidPositions(side: number, top: number, bottom: number, follow: (k: number) => number): number[] {
  const out: number[] = [];
  for (let k = 0; k < RINGS; k++) {
    const share = follow(k);
    const t0 = OPENING.top + (top - OPENING.top) * share;
    const b0 = OPENING.bottom + (bottom - OPENING.bottom) * share;
    const offset = ringOffset(k);
    for (let i = 0; i < POINTS; i++) {
      const t = i / POINTS;
      const upperSide = t < 0.5;
      const along = upperSide ? t * 2 : 2 - t * 2; // 0 = inner corner, 1 = outer corner
      const edge = openingEdges(along, t0, b0);
      const corner = Math.abs(along - 0.5) * 2; // 1 at the corners
      // Away from the opening: up or down along the lids, sideways around the corners.
      const alpha = edge.alpha + Math.sign(along - 0.5) * offset * corner ** 3;
      const beta = (upperSide ? edge.upper : edge.lower) + (upperSide ? 1 : -1) * offset * (1 - 0.6 * corner ** 3);
      eyePoint(side, alpha, beta, E.radius + LIFT[k], out);
    }
  }
  return out;
}

const SKIN = [232, 224, 220];
const LASH = [44, 33, 30];
const CORNER = [212, 164, 156];
const toLinear = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);

export function buildLid(side: number): LidMeshData {
  const moving = (k: number) => Math.max(0, 1 - k / 7) ** 1.4;
  const base = lidPositions(side, OPENING.top, OPENING.bottom, () => 1);
  const delta = (state: number[]) => new Float32Array(state.map((v, i) => v - base[i]));
  const morphs: Record<LidMorph, Float32Array> = {
    upperClose: delta(lidPositions(side, CLOSED_UPPER, OPENING.bottom, moving)),
    lowerClose: delta(lidPositions(side, OPENING.top, CLOSED_LOWER, moving)),
    upperWide: delta(lidPositions(side, OPENING.top + 0.13, OPENING.bottom, moving)),
  };

  // Dark lash lines along the edges (strong on top), and the pink inner corner.
  const colors: number[] = [];
  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < POINTS; i++) {
      const t = i / POINTS;
      const upperSide = t < 0.5;
      const along = upperSide ? t * 2 : 2 - t * 2;
      const inner = Math.max(0, 1 - along * 9) * (k < 3 ? 1 : 0);
      const lash = k === 0 ? (upperSide ? 0.95 : 0.55) : k === 1 ? (upperSide ? 0.75 : 0.2) : 0;
      for (let j = 0; j < 3; j++) {
        const pinked = SKIN[j] + (CORNER[j] - SKIN[j]) * inner;
        colors.push(toLinear(pinked + (LASH[j] - pinked) * lash * (1 - inner)));
      }
    }
  }

  const indices: number[] = [];
  for (let k = 0; k < RINGS - 1; k++) {
    for (let i = 0; i < POINTS; i++) {
      const a = k * POINTS + i;
      const b = k * POINTS + ((i + 1) % POINTS);
      const c = (k + 1) * POINTS + ((i + 1) % POINTS);
      const d = (k + 1) * POINTS + i;
      // The right eye is a mirror image, so its triangles wind the other way.
      if (side > 0) indices.push(a, b, c, a, c, d);
      else indices.push(a, c, b, a, d, c);
    }
  }
  return { positions: new Float32Array(base), colors: new Float32Array(colors), indices: new Uint32Array(indices), morphs };
}
