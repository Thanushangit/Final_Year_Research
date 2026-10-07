"use client";

// The mechanical details on the head, as in the reference: layered black ear discs, raised plates on
// the sides of the skull with screws, and thin seams over the crown and along the jaw.
import { useEffect, useMemo } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, SphereGeometry, Vector3 } from "three";
import { SKIN_ORIGIN, skinPoint } from "../face/headMesh";
import { FACE } from "../face/landmarks";
import { useRobotMaterials } from "../materials";
import type { Side } from "../robotConstants";
import { cable, type Point3 } from "../shapes";

const EAR = FACE.ear;
const ACROSS: [number, number, number] = [Math.PI / 2, 0, 0]; // turns a ring to face along the disc's axis

/** Stacked layers of the ear disc, from the head outwards: radius, thickness, finish, and where each sits. */
const EAR_LAYERS = (() => {
  const layers = [
    { radius: EAR.radius, depth: 0.014, finish: "mech" },
    { radius: EAR.radius - 0.003, depth: 0.006, finish: "metal" },
    { radius: EAR.radius - 0.006, depth: 0.01, finish: "mech" },
    { radius: EAR.radius - 0.013, depth: 0.004, finish: "cable" },
  ] as const;
  let bottom = 0;
  return layers.map((layer) => {
    const y = bottom + layer.depth / 2;
    bottom += layer.depth;
    return { ...layer, y, top: bottom };
  });
})();
const EAR_FACE = EAR_LAYERS[EAR_LAYERS.length - 1].top;

/**
 * A round "headphone" disc where the ear would be, built up in steps like the reference: black housing,
 * a light metal band, a black ring, then a glossy grooved face with a centre cap.
 */
export function EarDisc({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const s = side === "left" ? 1 : -1;
  const face = EAR_FACE;
  return (
    // Turned so the disc's axis (local +y) points straight out from the side of the head.
    <group position={[s * EAR.x, EAR.y, EAR.z]} rotation={[0, 0, -s * (Math.PI / 2)]}>
      {EAR_LAYERS.map((layer) => (
        <group key={layer.radius}>
          <mesh material={m[layer.finish]} position={[0, layer.y, 0]} castShadow>
            <cylinderGeometry args={[layer.radius, layer.radius, layer.depth, 48]} />
          </mesh>
          {/* A rounded edge on each step. */}
          <mesh material={m[layer.finish]} position={[0, layer.top, 0]} rotation={ACROSS}>
            <torusGeometry args={[layer.radius - 0.0015, 0.0015, 8, 48]} />
          </mesh>
        </group>
      ))}
      {[0.017, 0.01].map((radius) => (
        <mesh key={radius} material={m.metal} position={[0, face + 0.0003, 0]} rotation={ACROSS}>
          <torusGeometry args={[radius, 0.001, 8, 40]} />
        </mesh>
      ))}
      <mesh material={m.cable} position={[0, face + 0.003, 0]}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.006, 24]} />
      </mesh>
    </group>
  );
}

// The side plates (left side; mirrored for the right), as in the reference: from near the crown, down
// the temple, to the top of the ear disc, and back. Rough outline points; only their direction matters,
// because the plate is laid onto the skin.
const PLATE: Point3[] = [
  [0.05, 0.172, 0.04],
  [0.064, 0.152, 0.056],
  [0.074, 0.128, 0.056],
  [0.082, 0.108, 0.044],
  [0.086, 0.096, 0.026],
  [0.088, 0.1, 0],
  [0.086, 0.1, -0.03],
  [0.078, 0.112, -0.058],
  [0.068, 0.138, -0.07],
  [0.058, 0.162, -0.052],
  [0.052, 0.175, -0.01],
];
const PLATE_LIFT = 0.0016;
const PLATE_SCREWS: Point3[] = [[0.07, 0.14, 0.045], [0.08, 0.116, 0.034], [0.072, 0.14, -0.045]];
/** Seams: an arc over the crown, and the face plate's edge from under the ear down along the jaw. */
const CROWN: Point3[] = [[-0.04, 0.19, 0.03], [0, 0.199, 0.036], [0.04, 0.19, 0.03]];
const JAW_EDGE: Point3[] = [[0.08, 0.032, -0.012], [0.072, 0.006, 0.004], [0.064, -0.018, 0.024], [0.048, -0.036, 0.05]];

const mirror = ([x, y, z]: Point3): Point3 => [-x, y, z];
const onSkin = (points: Point3[], lift = 0.0002) => points.map(([x, y, z]) => skinPoint(x, y, z, lift));

/**
 * A plate laid onto the skin and raised off it: rings from the outline's middle out to its edge, a
 * rounded rim, and a short wall down into the skin.
 */
function sidePlate(outline: Point3[]): BufferGeometry {
  const [ox, oy, oz] = SKIN_ORIGIN;
  const toDir = ([x, y, z]: Point3) => new Vector3(x - ox, y - oy, z - oz).normalize();
  const edge = new CatmullRomCurve3(outline.map(toDir), true).getSpacedPoints(96).slice(0, 96);
  const centre = edge.reduce((sum, d) => sum.add(d), new Vector3()).normalize();
  const rings: Array<[number, number]> = [[0, PLATE_LIFT], [0.4, PLATE_LIFT], [0.7, PLATE_LIFT], [0.88, PLATE_LIFT], [0.96, PLATE_LIFT * 0.9], [1, PLATE_LIFT * 0.55], [1, -0.001]];
  const positions: number[] = [];
  for (const [s, lift] of rings) {
    for (const d of edge) {
      const dir = centre.clone().lerp(d, s).normalize();
      positions.push(...skinPoint(ox + dir.x * 0.1, oy + dir.y * 0.1, oz + dir.z * 0.1, lift));
    }
  }
  const n = edge.length;
  const indices: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let k = 0; k < n; k++) {
      const a = r * n + k;
      const b = r * n + ((k + 1) % n);
      indices.push(a, a + n, b, b, a + n, b + n);
    }
  }
  // The outline may run either way round (the mirrored plate does): make the faces point out of the head.
  const corner = (i: number) => new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  const [p, q, r] = [n, 2 * n, n + 1].map(corner);
  if (q.sub(p).cross(r.sub(p)).dot(centre) < 0) {
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function ScalpSeams() {
  const m = useRobotMaterials();
  const geometries = useMemo(() => {
    const plate = sidePlate(PLATE);
    const plates = mergeGeometries([plate, sidePlate(PLATE.map(mirror))]);
    plate.dispose();
    const lines = [CROWN, JAW_EDGE, JAW_EDGE.map(mirror)];
    const ring = [...PLATE, PLATE[0]];
    const seams = mergeGeometries([
      ...lines.map((line) => cable(onSkin(line), 0.00055, 48)),
      // A dark gap all round each plate, where it meets the skin.
      ...[ring, ring.map(mirror)].map((line) => cable(onSkin(line, 0.0004), 0.0009, 120)),
    ]);
    const screws = mergeGeometries(
      onSkin([...PLATE_SCREWS, ...PLATE_SCREWS.map(mirror)], PLATE_LIFT).map(([x, y, z]) => new SphereGeometry(0.0014, 10, 8).translate(x, y, z)),
    );
    return { plates, seams, screws };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <>
      <mesh geometry={geometries.plates} material={m.armor} castShadow />
      <mesh geometry={geometries.seams} material={m.mech} />
      <mesh geometry={geometries.screws} material={m.screw} />
    </>
  );
}
