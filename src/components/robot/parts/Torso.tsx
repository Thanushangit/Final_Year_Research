"use client";

// The torso from the reference: a dark mechanical body covered in off-white armour plates (chest,
// collar, shoulders, an arch around the stomach), with a black slatted core in the middle whose back
// panel glows in the predicted emotion's colour.
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, type ReactNode } from "react";
import { LatheGeometry, SphereGeometry, SplineCurve, Vector2, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useRobotMaterials } from "../materials";
import { JOINT } from "../robotConstants";
import { armorPlate, type PlateOptions, type Point2, type Point3 } from "../shapes";

/** Half-width of the dark body at each height above the waist (it is squashed front to back). */
const BODY_PROFILE: Point2[] = [
  [0.001, 0],
  [0.11, 0.005],
  [0.128, 0.06],
  [0.138, 0.16],
  [0.146, 0.27],
  [0.15, 0.36],
  [0.142, 0.43],
  [0.118, 0.485],
  [0.07, 0.525],
  [0.001, 0.535],
];
const BODY_SCALE: Point3 = [1.18, 1, 0.78];

interface PlateSpec {
  /** Outline for the left half: x across the body, y relative to `y`. */
  outline: Point2[];
  y: number;
  z: number;
  /** Tilt back around the sideways axis (to face up-forward). */
  tilt?: number;
  options: PlateOptions;
  /** Screw positions on the plate, in outline coordinates. */
  screws?: Point2[];
}

const PLATES: PlateSpec[] = [
  // Chest: a big curved plate on each side of the centre seam, rising towards the shoulder.
  {
    outline: [[0.005, 0.06], [0.07, 0.092], [0.148, 0.085], [0.178, 0.05], [0.182, -0.03], [0.16, -0.075], [0.095, -0.095], [0.005, -0.085]],
    y: 0.38,
    z: 0.108,
    options: { thickness: 0.018, bevel: 0.004, corner: 0.014, bendAcross: 0.24, bendDown: 0.32 },
    screws: [[0.035, 0.06], [0.165, 0.035]],
  },
  // Collar plates at the base of the neck, facing up and forward.
  {
    outline: [[0.022, 0.024], [0.085, 0.03], [0.102, 0.0], [0.076, -0.026], [0.03, -0.02]],
    y: 0.495,
    z: 0.084,
    tilt: -0.5,
    options: { thickness: 0.014, corner: 0.008, bendAcross: 0.3 },
    screws: [[0.05, 0.004], [0.082, 0.012]],
  },
  // Plates over the top of the shoulders, from the collar out to the shoulder caps.
  {
    outline: [[0.065, 0.04], [0.185, 0.035], [0.205, 0.0], [0.188, -0.045], [0.07, -0.048]],
    y: 0.512,
    z: 0.035,
    tilt: -1.0,
    options: { thickness: 0.013, corner: 0.012 },
    screws: [[0.17, 0.018], [0.09, -0.02]],
  },
  // The band across the top of the stomach (the top of the arch around the core).
  {
    outline: [[0.005, 0.017], [0.138, 0.017], [0.152, 0.0], [0.138, -0.017], [0.005, -0.017]],
    y: 0.267,
    z: 0.1,
    options: { thickness: 0.014, corner: 0.006, bendAcross: 0.22 },
    screws: [[0.11, 0.0]],
  },
  // The sides of the arch, framing the core.
  {
    outline: [[0.05, 0.03], [0.128, 0.03], [0.132, -0.07], [0.1, -0.1], [0.058, -0.1], [0.046, -0.05]],
    y: 0.212,
    z: 0.098,
    options: { thickness: 0.014, corner: 0.008, bendAcross: 0.22 },
    screws: [[0.064, 0.012]],
  },
  // Side plates further round.
  {
    outline: [[0.136, 0.05], [0.168, 0.04], [0.172, -0.06], [0.142, -0.085]],
    y: 0.212,
    z: 0.09,
    options: { thickness: 0.012, corner: 0.006, bendAcross: 0.2 },
  },
];

/** Where a point on a plate's front ends up after the plate is bent (to place its screws). */
function plateSurface(plate: PlateSpec, [x, y]: Point2): Point3 {
  const front = plate.options.thickness + (plate.options.bevel ?? 0.003) + 0.0008;
  let px = x;
  let py = y;
  let pz = front;
  const across = plate.options.bendAcross;
  if (across) [px, pz] = [Math.sin(x / across) * (across + pz), Math.cos(x / across) * (across + pz) - across];
  const down = plate.options.bendDown;
  if (down) [py, pz] = [Math.sin(y / down) * (down + pz), Math.cos(y / down) * (down + pz) - down];
  const tilt = plate.tilt ?? 0;
  return [px, plate.y + py * Math.cos(tilt) - pz * Math.sin(tilt), plate.z + py * Math.sin(tilt) + pz * Math.cos(tilt)];
}

/** Black slats over the glowing core, top to bottom: width and centre height. */
const SLATS: Array<[number, number]> = [
  [0.08, 0.236],
  [0.073, 0.205],
  [0.066, 0.174],
  [0.058, 0.143],
];
const SLAT_HEIGHT = 0.02;

/** Both halves of the body: the right half is the left half mirrored. */
function BothSides({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <group scale={[-1, 1, 1]}>{children}</group>
    </>
  );
}

export function Torso() {
  const m = useRobotMaterials();
  const geometries = useMemo(() => {
    const outline = new SplineCurve(BODY_PROFILE.map(([x, y]) => new Vector2(x, y))).getPoints(48);
    const screws = PLATES.flatMap((plate) => (plate.screws ?? []).map((spot) => plateSurface(plate, spot)));
    return {
      body: new LatheGeometry(outline, 48),
      plates: PLATES.map((plate) => armorPlate(plate.outline, plate.options)),
      screws: mergeGeometries(screws.map(([x, y, z]) => new SphereGeometry(0.0026, 10, 8).scale(1, 1, 0.5).translate(x, y, z))),
    };
  }, []);
  useEffect(
    () => () => [geometries.body, geometries.screws, ...geometries.plates].forEach((geometry: BufferGeometry) => geometry.dispose()),
    [geometries],
  );

  return (
    <group>
      <mesh geometry={geometries.body} scale={BODY_SCALE} material={m.mech} castShadow receiveShadow />
      <BothSides>
        {PLATES.map((plate, i) => (
          <mesh
            key={i}
            geometry={geometries.plates[i]}
            position={[0, plate.y, plate.z]}
            rotation={[plate.tilt ?? 0, 0, 0]}
            material={m.armor}
            castShadow
            receiveShadow
          />
        ))}
        <mesh geometry={geometries.screws} material={m.screw} />
        {/* Pistons beside the core, with a metal collar. */}
        <mesh material={m.cable} position={[0.06, 0.188, 0.09]}>
          <cylinderGeometry args={[0.0085, 0.0085, 0.15, 16]} />
        </mesh>
        <mesh material={m.metal} position={[0.06, 0.2, 0.09]}>
          <cylinderGeometry args={[0.011, 0.011, 0.012, 16]} />
        </mesh>
        {/* Machinery at the side of the chest, under the shoulder. */}
        <mesh material={m.mech} position={[0.185, 0.425, 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.05, 24]} />
        </mesh>
      </BothSides>

      {/* The core: a recess behind black slats. Its back panel glows (Robot.tsx sets the colour). */}
      <mesh material={m.mech} position={[0, 0.19, 0.07]}>
        <boxGeometry args={[0.1, 0.135, 0.03]} />
      </mesh>
      <mesh name={JOINT.chestPanel} material={m.core} position={[0, 0.19, 0.086]}>
        <boxGeometry args={[0.088, 0.122, 0.004]} />
      </mesh>
      {SLATS.map(([width, y]) => (
        <RoundedBox key={y} args={[width, SLAT_HEIGHT, 0.014]} radius={0.004} smoothness={2} position={[0, y, 0.096]} material={m.mech} />
      ))}
      {/* The plate below the core. */}
      <RoundedBox args={[0.1, 0.034, 0.016]} radius={0.006} smoothness={2} position={[0, 0.112, 0.1]} material={m.armor} />
    </group>
  );
}
