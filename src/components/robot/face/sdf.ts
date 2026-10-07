// Signed distance functions: each returns how far a point is from a shape's surface (negative inside).
// Shapes are blended with smooth unions, which is how the head is sculpted in code.
// Plain numbers only (no three.js), so this runs fast, and also inside the background worker.

export type V3 = [number, number, number];

/** An ellipsoid stored ready for fast use: centre, then 1 / each radius. */
export type Ellipsoid = Float64Array;

export function makeEllipsoid(c: V3, r: V3): Ellipsoid {
  return new Float64Array([c[0], c[1], c[2], 1 / r[0], 1 / r[1], 1 / r[2]]);
}

/** Ellipsoid (a good approximation near the surface, which is all we need). */
export function ellipsoid(px: number, py: number, pz: number, s: Ellipsoid): number {
  const x = (px - s[0]) * s[3];
  const y = (py - s[1]) * s[4];
  const z = (pz - s[2]) * s[5];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const x1 = x * s[3];
  const y1 = y * s[4];
  const z1 = z * s[5];
  const k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
  return k1 === 0 ? -0.001 : (k0 * (k0 - 1)) / k1;
}

/** A capsule whose radius changes from ra (at a) to rb (at b). */
export function roundCone(px: number, py: number, pz: number, a: V3, b: V3, ra: number, rb: number): number {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const pax = px - a[0];
  const pay = py - a[1];
  const paz = pz - a[2];
  const len2 = bax * bax + bay * bay + baz * baz;
  const t = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / len2));
  const dx = pax - bax * t;
  const dy = pay - bay * t;
  const dz = paz - baz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}

/** Smooth union: like min, but the two shapes melt together over distance k. */
export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}

/** Smooth subtraction of b from a. */
export function ssub(a: number, b: number, k: number): number {
  return -smin(-a, b, k);
}

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export const gauss = (d2: number, sigma: number) => Math.exp(-d2 / (2 * sigma * sigma));
