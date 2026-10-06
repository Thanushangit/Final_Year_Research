"use client";

import type { Material } from "three";
import { useRobotMaterials } from "../materials";
import { BODY, JOINT, type Side } from "../robotConstants";

/** A cap of a sphere pointing forward (+z), for the iris and pupil so they follow the eyeball's curve. */
function Cap({ radius, angle, material }: { radius: number; angle: number; material: Material }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} material={material}>
      <sphereGeometry args={[radius, 32, 6, 0, Math.PI * 2, 0, angle]} />
    </mesh>
  );
}

/**
 * One eye. The eyeball group turns to look around; the two lids are separate shells that tilt
 * closed over it (both at 0 = closed), so blinks look real.
 */
export function Eye({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const r = BODY.eye.radius;
  const left = side === "left";
  return (
    <group position={[left ? BODY.eye.x : -BODY.eye.x, BODY.eye.y, BODY.eye.z]}>
      <group name={left ? JOINT.eyeL : JOINT.eyeR}>
        <mesh material={m.eyeWhite}>
          <sphereGeometry args={[r, 32, 24]} />
        </mesh>
        <Cap radius={r * 1.002} angle={0.7} material={m.irisRing} />
        <Cap radius={r * 1.004} angle={0.6} material={m.iris} />
        <Cap radius={r * 1.006} angle={0.27} material={m.pupil} />
        <mesh position={[-r * 0.22, r * 0.24, r * 0.97]} material={m.highlight}>
          <sphereGeometry args={[r * 0.1, 10, 8]} />
        </mesh>
      </group>
      <group name={left ? JOINT.upperLidL : JOINT.upperLidR}>
        <mesh material={m.visor}>
          <sphereGeometry args={[r * 1.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      <group name={left ? JOINT.lowerLidL : JOINT.lowerLidR}>
        <mesh material={m.visor}>
          <sphereGeometry args={[r * 1.1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
}
