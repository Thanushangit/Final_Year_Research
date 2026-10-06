"use client";

import { useRobotMaterials } from "../materials";
import { BODY, armJoint, type Side } from "../robotConstants";
import { Hand } from "./Hand";

/** Shoulder → upper arm → elbow → forearm → wrist → hand. Each joint is a group at its pivot point. */
export function Arm({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const names = armJoint(side);
  const { upperArm, forearm } = BODY;
  return (
    <group name={names.shoulder} position={[side === "left" ? BODY.shoulderX : -BODY.shoulderX, BODY.shoulderY, 0]}>
      <mesh material={m.joint} castShadow>
        <sphereGeometry args={[0.05, 24, 16]} />
      </mesh>
      <mesh material={m.shell} position={[0, -upperArm.length / 2, 0]} castShadow>
        <capsuleGeometry args={[upperArm.radius, upperArm.length - 2 * upperArm.radius, 6, 16]} />
      </mesh>
      <group name={names.elbow} position={[0, -upperArm.length, 0]}>
        <mesh material={m.joint} castShadow>
          <sphereGeometry args={[0.038, 20, 14]} />
        </mesh>
        <mesh material={m.shell} position={[0, -forearm.length / 2, 0]} castShadow>
          <capsuleGeometry args={[forearm.radius, forearm.length - 2 * forearm.radius, 6, 16]} />
        </mesh>
        {/* A gold cuff just above the wrist. */}
        <mesh material={m.gold} position={[0, -forearm.length + 0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[forearm.radius + 0.001, 0.004, 10, 32]} />
        </mesh>
        <group name={names.wrist} position={[0, -forearm.length, 0]}>
          <mesh material={m.joint}>
            <sphereGeometry args={[0.027, 16, 12]} />
          </mesh>
          <Hand side={side} />
        </group>
      </group>
    </group>
  );
}
