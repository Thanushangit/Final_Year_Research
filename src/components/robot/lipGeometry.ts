// Lips: a soft tube from one mouth corner to the other, thicker in the middle. Four morph targets
// (smile, wide, round, press) reshape the same tube, so lip-sync and emotions can blend them freely.
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

interface LipShape {
  width: number;
  /** Height of the middle of the lip and of its corners (corners up = smile). */
  centreY: number;
  cornerY: number;
  /** How far the middle pushes forward. */
  bulge: number;
  thickness: number;
}

const SEGMENTS = 24;
const RADIAL = 10;

type LipKind = "upper" | "lower";

const BASE: Record<LipKind, LipShape> = {
  upper: { width: 0.085, centreY: 0.003, cornerY: -0.001, bulge: 0.006, thickness: 0.0065 },
  lower: { width: 0.08, centreY: -0.004, cornerY: 0, bulge: 0.007, thickness: 0.0072 },
};

/** Changes from the base shape for each morph target, in the order pose.ts writes them. */
const TARGETS: Record<LipKind, Array<Partial<LipShape>>> = {
  upper: [
    { cornerY: 0.012, width: 0.092 }, // smile
    { width: 0.108, thickness: 0.005, bulge: 0.004 }, // wide
    { width: 0.05, bulge: 0.016, thickness: 0.0085, centreY: 0.006 }, // round
    { thickness: 0.0042, centreY: 0.0015, bulge: 0.004 }, // press
  ],
  lower: [
    { cornerY: 0.013, width: 0.088 },
    { width: 0.104, thickness: 0.0055, bulge: 0.005 },
    { width: 0.048, bulge: 0.017, centreY: -0.007, thickness: 0.009 },
    { thickness: 0.0045, centreY: -0.0015, bulge: 0.004 },
  ],
};

function lipPositions(shape: LipShape): number[] {
  const positions: number[] = [];
  const centre = new Vector3();
  const tangent = new Vector3();
  const up = new Vector3();
  const out = new Vector3();
  const forward = new Vector3(0, 0, 1);
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * 2 - 1; // −1 at one corner, 1 at the other
    centre.set((t * shape.width) / 2, shape.centreY + (shape.cornerY - shape.centreY) * t * t, shape.bulge * (1 - t * t));
    tangent.set(shape.width / 2, 2 * (shape.cornerY - shape.centreY) * t, -2 * shape.bulge * t).normalize();
    up.crossVectors(forward, tangent).normalize();
    out.crossVectors(tangent, up).normalize();
    const radius = shape.thickness * (0.3 + 0.7 * Math.sqrt(1 - t * t));
    for (let k = 0; k < RADIAL; k++) {
      const angle = (k / RADIAL) * Math.PI * 2;
      // A flattened ring: taller than it is deep.
      positions.push(
        centre.x + up.x * Math.cos(angle) * radius + out.x * Math.sin(angle) * radius * 0.7,
        centre.y + up.y * Math.cos(angle) * radius + out.y * Math.sin(angle) * radius * 0.7,
        centre.z + up.z * Math.cos(angle) * radius + out.z * Math.sin(angle) * radius * 0.7,
      );
    }
  }
  return positions;
}

export function createLipGeometry(kind: LipKind): BufferGeometry {
  const geometry = new BufferGeometry();
  const base = lipPositions(BASE[kind]);
  const indices: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    for (let k = 0; k < RADIAL; k++) {
      const a = i * RADIAL + k;
      const b = (i + 1) * RADIAL + k;
      const c = (i + 1) * RADIAL + ((k + 1) % RADIAL);
      const d = i * RADIAL + ((k + 1) % RADIAL);
      indices.push(a, b, d, b, c, d);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(base, 3));
  geometry.computeVertexNormals();
  // Morph targets store the change from the base shape, so a negative smile makes a frown.
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = TARGETS[kind].map((change) => {
    const target = lipPositions({ ...BASE[kind], ...change });
    return new Float32BufferAttribute(target.map((value, i) => value - base[i]), 3);
  });
  return geometry;
}
