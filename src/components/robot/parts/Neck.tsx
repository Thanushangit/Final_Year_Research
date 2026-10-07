"use client";

// The mechanical neck from the reference: a stacked black column at the front, a dark core, and glossy
// cables running from under the head down and out to the collar and shoulders.
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TorusGeometry } from "three";
import { useRobotMaterials } from "../materials";
import { BODY } from "../robotConstants";
import { cable, type Point3 } from "../shapes";

const TOP = BODY.neckLength - 0.025; // just inside the bottom of the head

/** Column blocks from the bottom up: width, height, depth, and where each one's centre sits. */
const COLUMN = (() => {
  const sizes = [
    [0.036, 0.02, 0.026],
    [0.034, 0.019, 0.025],
    [0.032, 0.018, 0.024],
    [0.03, 0.018, 0.023],
    [0.028, 0.017, 0.022],
  ] as const;
  let bottom = -0.035;
  return sizes.map(([width, height, depth]) => {
    const block = { width, height, depth, y: bottom + height / 2 };
    bottom += height + 0.004;
    return block;
  });
})();

/** Cables on the left side (mirrored for the right): from under the head to the collar and shoulders. */
const CABLES: Array<{ points: Point3[]; radius: number }> = [
  { points: [[0.016, TOP, 0.014], [0.02, 0.04, 0.022], [0.03, -0.005, 0.03], [0.045, -0.045, 0.045]], radius: 0.0062 },
  { points: [[0.03, TOP, 0.002], [0.038, 0.035, 0.006], [0.062, -0.015, 0.012], [0.095, -0.045, 0.012]], radius: 0.0072 },
  { points: [[0.026, TOP, -0.022], [0.046, 0.03, -0.026], [0.085, -0.015, -0.028], [0.13, -0.04, -0.03]], radius: 0.0068 },
  { points: [[0.012, TOP, -0.03], [0.022, 0.03, -0.038], [0.045, -0.02, -0.045], [0.07, -0.05, -0.05]], radius: 0.0058 },
];

const mirror = (points: Point3[]): Point3[] => points.map(([x, y, z]) => [-x, y, z]);

export function Neck() {
  const m = useRobotMaterials();
  const geometries = useMemo(() => {
    const all = CABLES.flatMap(({ points, radius }) => [cable(points, radius), cable(mirror(points), radius)]);
    // Metal collars a little way up the two front cables on each side.
    const rings = CABLES.slice(0, 2).flatMap(({ points, radius }) =>
      [points, mirror(points)].map((line) => {
        const [x, y, z] = line[2];
        return new TorusGeometry(radius + 0.0012, 0.0016, 8, 20).rotateX(Math.PI / 2).translate(x, y, z);
      }),
    );
    return { cables: mergeGeometries(all), rings: mergeGeometries(rings) };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);

  return (
    <group>
      <mesh material={m.mech} position={[0, (TOP - 0.06) / 2, -0.006]} castShadow>
        <cylinderGeometry args={[0.03, 0.036, TOP + 0.06, 24]} />
      </mesh>
      {COLUMN.map(({ width, height, depth, y }) => (
        <RoundedBox key={y} args={[width, height, depth]} radius={0.003} smoothness={2} position={[0, y, 0.019]} material={m.mech} />
      ))}
      <mesh geometry={geometries.cables} material={m.cable} castShadow />
      <mesh geometry={geometries.rings} material={m.metal} />
    </group>
  );
}
