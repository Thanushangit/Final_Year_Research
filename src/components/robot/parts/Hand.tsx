"use client";

import { RoundedBox } from "@react-three/drei";
import { useRobotMaterials } from "../materials";
import { BODY, armJoint, type Side } from "../robotConstants";

const WRIST_GAP = 0.012;

/** A finger: a knuckle pivot, a base segment, then a second pivot and a tip segment. Both bend to curl. */
function Finger({ baseName, tipName, x }: { baseName: string; tipName: string; x: number }) {
  const m = useRobotMaterials();
  const { radius, base, tip } = BODY.finger;
  const [, palmLength] = BODY.palm.size;
  return (
    <group name={baseName} position={[x, -palmLength - WRIST_GAP + 0.004, -0.002]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[radius * 1.08, 12, 10]} />
      </mesh>
      <mesh material={m.shell} position={[0, -base / 2, 0]} castShadow>
        <capsuleGeometry args={[radius, base - 2 * radius, 4, 10]} />
      </mesh>
      <group name={tipName} position={[0, -base, 0]}>
        <mesh material={m.shell} position={[0, -tip / 2, 0]} castShadow>
          <capsuleGeometry args={[radius * 0.92, tip - 2 * radius * 0.92, 4, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A hand hanging from the wrist: palm (palm side faces −z), three two-part fingers and a two-part
 * thumb on the inner edge. The empty "grip" group is where a held sheet of paper is fixed.
 */
export function Hand({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const names = armJoint(side);
  const inner = side === "left" ? -1 : 1; // the thumb sits on the side nearest the body's middle
  const [palmWidth, palmLength, palmThickness] = BODY.palm.size;
  const { radius, spread } = BODY.finger;

  return (
    <group>
      <RoundedBox
        args={[palmWidth, palmLength, palmThickness]}
        radius={0.011}
        smoothness={3}
        position={[0, -palmLength / 2 - WRIST_GAP, 0]}
        material={m.shell}
        castShadow
      />
      {[-1, 0, 1].map((slot, i) => (
        <Finger key={slot} baseName={names.fingerBase(i)} tipName={names.fingerTip(i)} x={slot * spread} />
      ))}
      <group name={names.thumbBase} position={[inner * (palmWidth / 2 - 0.002), -0.032, -0.006]}>
        <mesh material={m.joint}>
          <sphereGeometry args={[radius * 1.15, 12, 10]} />
        </mesh>
        <mesh material={m.shell} position={[0, -0.012, 0]} castShadow>
          <capsuleGeometry args={[radius, 0.006, 4, 10]} />
        </mesh>
        <group name={names.thumbTip} position={[0, -0.024, 0]}>
          <mesh material={m.shell} position={[0, -0.01, 0]} castShadow>
            <capsuleGeometry args={[radius * 0.92, 0.004, 4, 10]} />
          </mesh>
        </group>
      </group>
      <group name={names.grip} position={[0, -palmLength * 0.8 - WRIST_GAP, -palmThickness]} />
    </group>
  );
}
