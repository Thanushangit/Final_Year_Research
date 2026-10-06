"use client";

import { RoundedBox } from "@react-three/drei";
import { useRobotMaterials } from "../materials";
import { BODY, JOINT, type Side } from "../robotConstants";
import { Eye } from "./Eye";
import { Mouth } from "./Mouth";

/** A thin bar above the eye. Its group is the pivot: it tilts (inner end up or down) and rises. */
function Brow({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const left = side === "left";
  return (
    <group
      name={left ? JOINT.browL : JOINT.browR}
      position={[left ? BODY.brow.x : -BODY.brow.x, BODY.brow.y, BODY.brow.z]}
      // Turned slightly to follow the curve of the face.
      rotation={[0, left ? 0.35 : -0.35, 0]}
    >
      <RoundedBox args={[...BODY.brow.size]} radius={0.0035} smoothness={2} material={m.lip} />
    </group>
  );
}

/** Round ear pods with a gold ring on each side of the head. */
function Ear({ side }: { side: 1 | -1 }) {
  const m = useRobotMaterials();
  return (
    <group position={[side * 0.178, BODY.head.centreY + 0.005, -0.005]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m.joint} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 0.03, 32]} />
      </mesh>
      <mesh material={m.gold} position={[0, -side * 0.016, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.034, 0.004, 12, 40]} />
      </mesh>
    </group>
  );
}

/** The head pivots at the top of the neck. A rounded ivory skull with a dark face plate in front. */
export function Head() {
  const m = useRobotMaterials();
  const { head } = BODY;
  const top = head.centreY + head.radius;
  return (
    <group name={JOINT.head} position={[0, BODY.neckLength, 0]}>
      <group position={[0, head.centreY, 0]} scale={head.scale}>
        <mesh material={m.shell} castShadow receiveShadow>
          <sphereGeometry args={[head.radius, 48, 32]} />
        </mesh>
        {/* The face plate: the front part of a slightly bigger sphere, so it hugs the skull. */}
        <mesh material={m.visor}>
          <sphereGeometry args={[head.visorRadius, 48, 32, Math.PI / 2 - 0.85, 1.7, 0.82, 1.55]} />
        </mesh>
      </group>
      <Ear side={1} />
      <Ear side={-1} />
      <mesh material={m.gold} position={[0, top + 0.022, -0.02]} castShadow>
        <cylinderGeometry args={[0.004, 0.006, 0.05, 12]} />
      </mesh>
      <mesh material={m.gold} position={[0, top + 0.05, -0.02]} castShadow>
        <sphereGeometry args={[0.013, 16, 12]} />
      </mesh>
      <Eye side="left" />
      <Eye side="right" />
      <Brow side="left" />
      <Brow side="right" />
      <Mouth />
    </group>
  );
}
