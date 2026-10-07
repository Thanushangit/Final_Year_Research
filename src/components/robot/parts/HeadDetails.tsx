"use client";

// The mechanical details on the head, as in the reference: layered black ear discs, and thin seams
// and screws marking the plates on the sides and top of the skull.
import { useEffect, useMemo } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SphereGeometry } from "three";
import { skinPoint } from "../face/headMesh";
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

// Seam lines (left side; mirrored for the right): the temple plate's front and top edges, and an arc
// over the crown. Rough points, each projected onto the skin.
const PLATE_FRONT: Point3[] = [[0.045, 0.174, 0.048], [0.06, 0.152, 0.06], [0.069, 0.127, 0.062], [0.074, 0.104, 0.052], [0.074, 0.092, 0.036]];
const PLATE_TOP: Point3[] = [[0.045, 0.174, 0.048], [0.05, 0.172, 0.0], [0.054, 0.163, -0.05], [0.058, 0.143, -0.088]];
const CROWN: Point3[] = [[-0.04, 0.19, 0.03], [0, 0.199, 0.036], [0.04, 0.19, 0.03]];
const SCREWS: Point3[] = [[0.066, 0.138, 0.054], [0.072, 0.117, 0.05], [0.074, 0.1, 0.04], [0.06, 0.165, -0.02]];

const mirror = ([x, y, z]: Point3): Point3 => [-x, y, z];
const onSkin = (points: Point3[]) => points.map(([x, y, z]) => skinPoint(x, y, z, 0.0002));

export function ScalpSeams() {
  const m = useRobotMaterials();
  const geometries = useMemo(() => {
    const lines = [PLATE_FRONT, PLATE_TOP, PLATE_FRONT.map(mirror), PLATE_TOP.map(mirror), CROWN];
    const seams = mergeGeometries(lines.map((line) => cable(onSkin(line), 0.00055, 48)));
    const screws = mergeGeometries(
      onSkin([...SCREWS, ...SCREWS.map(mirror)]).map(([x, y, z]) => new SphereGeometry(0.0014, 10, 8).translate(x, y, z)),
    );
    return { seams, screws };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <>
      <mesh geometry={geometries.seams} material={m.mech} />
      <mesh geometry={geometries.screws} material={m.screw} />
    </>
  );
}
