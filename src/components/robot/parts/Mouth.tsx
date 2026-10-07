"use client";

import { FACE } from "../face/landmarks";
import { useRobotMaterials } from "../materials";
import { JOINT } from "../robotConstants";

const [, HINGE_Y, HINGE_Z] = FACE.jawHinge;

/**
 * Behind the lips: a dark mouth inside and the teeth. The upper teeth stay with the head; the lower
 * teeth turn with the jaw (the lips and chin themselves are shape changes on the skin).
 */
export function Mouth() {
  const m = useRobotMaterials();
  return (
    <group>
      <mesh material={m.mouthInside} position={[0, -0.004, 0.07]} scale={[0.021, 0.015, 0.019]}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh material={m.teeth} position={[0, 0.0045, 0.068]}>
        <cylinderGeometry args={[0.0235, 0.0235, 0.008, 24, 1, false, -0.85, 1.7]} />
      </mesh>
      <group name={JOINT.jaw} position={[0, HINGE_Y, HINGE_Z]}>
        <mesh material={m.teeth} position={[0, -0.0025 - HINGE_Y, 0.068 - HINGE_Z]}>
          <cylinderGeometry args={[0.022, 0.022, 0.007, 24, 1, false, -0.8, 1.6]} />
        </mesh>
      </group>
    </group>
  );
}
