// The almond-shaped eye opening, shared by the face (which leaves a hole for it) and the eyelids (which
// frame it). Angles are around the eyeball centre: α across (+ towards the outer corner), β up.
// Real eye openings are wider than the eyeball, so the lids are stretched sideways near the corners.
import { FACE } from "./landmarks";

export const OPENING = {
  /** Corner positions across the eyeball (radians). */
  inner: -1.42,
  outer: 1.36,
  /** Corner heights: the outer corner sits a little higher. */
  innerTilt: -0.03,
  outerTilt: 0.06,
  /** How far the upper and lower edges reach from the corner line at their widest. */
  top: 0.5,
  bottom: -0.47,
};

/** How much wider than the eyeball the lids reach at angle α (1 in the middle, more at the corners). */
export const stretch = (alpha: number) => 1 + 0.16 * Math.abs(Math.sin(alpha)) ** 4;

/** A point at angles (α, β) and distance `radius` from the eye centre (side 1 = left eye, −1 = right). */
export function eyePoint(side: number, alpha: number, beta: number, radius: number, out: number[]): void {
  const E = FACE.eye;
  out.push(
    side * (E.x + stretch(alpha) * Math.sin(alpha) * Math.cos(beta) * radius),
    E.y + Math.sin(beta) * radius,
    E.z + Math.cos(alpha) * Math.cos(beta) * radius,
  );
}

/** The angles of a point relative to the (left) eye centre, undoing the sideways stretch. */
export function eyeAngles(ex: number, ey: number, ez: number): { alpha: number; beta: number } {
  const rough = Math.atan2(ex, ez);
  const sx = ex / stretch(rough);
  return { alpha: Math.atan2(sx, ez), beta: Math.atan2(ey, Math.hypot(sx, ez)) };
}

/** Upper and lower edge heights (β) at a point `along` the opening (0 = inner corner, 1 = outer corner). */
export function openingEdges(along: number, top = OPENING.top, bottom = OPENING.bottom): { alpha: number; upper: number; lower: number } {
  const a = Math.min(1, Math.max(0, along));
  const base = OPENING.innerTilt + (OPENING.outerTilt - OPENING.innerTilt) * a;
  // The upper edge peaks a little towards the nose, the lower edge dips a little towards the outer corner.
  const up = Math.sin(Math.PI * a ** 0.85) ** 0.75;
  const down = Math.sin(Math.PI * a ** 1.12) ** 0.85;
  return { alpha: OPENING.inner + (OPENING.outer - OPENING.inner) * a, upper: base + top * up, lower: base + bottom * down };
}

/** Roughly how far (radians) a direction is outside the opening; negative inside. */
export function openingDistance(alpha: number, beta: number): number {
  const along = (alpha - OPENING.inner) / (OPENING.outer - OPENING.inner);
  const { upper, lower } = openingEdges(along);
  const across = Math.max(OPENING.inner - alpha, alpha - OPENING.outer);
  return Math.max(beta - upper, lower - beta, across);
}
