"use client";

import { RoundedBox } from "@react-three/drei";
import { useRobotMaterials } from "../materials";
import { BODY, armJoint, type Side } from "../robotConstants";

const WRIST_GAP = 0.012;
const KNUCKLES_Y = -BODY.palm.size[1] - WRIST_GAP + 0.002;
/** Finger lengths compared with the middle finger: index, middle, ring, little. */
const FINGER_SCALE = [0.93, 1, 0.96, 0.8];

/** One finger segment (white, rounded) hanging from its joint, with a black joint at the top. */
function Segment({ length, radius }: { length: number; radius: number }) {
  const m = useRobotMaterials();
  return (
    <>
      <mesh material={m.mech}>
        <sphereGeometry args={[radius * 0.98, 12, 10]} />
      </mesh>
      <mesh material={m.armor} position={[0, -length / 2 - 0.001, 0]} castShadow>
        <capsuleGeometry args={[radius, Math.max(0.001, length - 2 * radius - 0.002), 4, 10]} />
      </mesh>
    </>
  );
}

/** A three-part finger: each joint is a group at its pivot, so the whole finger can curl. */
function Digit({ names, lengths, radius }: { names: [string, string, string]; lengths: readonly number[]; radius: number }) {
  return (
    <group name={names[0]}>
      <Segment length={lengths[0]} radius={radius} />
      <group name={names[1]} position={[0, -lengths[0], 0]}>
        <Segment length={lengths[1]} radius={radius * 0.95} />
        <group name={names[2]} position={[0, -lengths[1], 0]}>
          <Segment length={lengths[2]} radius={radius * 0.9} />
        </group>
      </group>
    </group>
  );
}

/**
 * A hand hanging from the wrist, as in the reference: black palm, white plate on the back of the hand,
 * four fingers and a thumb in white segments with black joints. The palm faces −z; the thumb sits on the
 * side nearest the body's middle. The empty "grip" group is where a held sheet of paper is fixed.
 */
export function Hand({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const names = armJoint(side);
  const inner = side === "left" ? -1 : 1;
  const [palmWidth, palmLength, palmThickness] = BODY.palm.size;
  const { radius, segments, spread } = BODY.finger;

  return (
    <group>
      <RoundedBox
        args={[palmWidth - 0.006, palmLength, palmThickness - 0.006]}
        radius={0.008}
        smoothness={3}
        position={[0, -palmLength / 2 - WRIST_GAP, -0.002]}
        material={m.mech}
        castShadow
      />
      <RoundedBox
        args={[palmWidth, palmLength - 0.004, 0.012]}
        radius={0.005}
        smoothness={3}
        position={[0, -palmLength / 2 - WRIST_GAP, palmThickness / 2 - 0.002]}
        material={m.armor}
        castShadow
      />
      <mesh material={m.mech} position={[0, KNUCKLES_Y + 0.004, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0095, 0.0095, palmWidth - 0.004, 16]} />
      </mesh>
      {FINGER_SCALE.map((scale, i) => (
        <group key={i} position={[inner * (1.5 - i) * spread, KNUCKLES_Y, -0.002]}>
          <Digit names={[names.finger(i, 0), names.finger(i, 1), names.finger(i, 2)]} lengths={segments.map((l) => l * scale)} radius={radius} />
        </group>
      ))}
      <group position={[inner * (palmWidth / 2 - 0.002), -0.03, -0.007]}>
        <Digit names={[names.thumb(0), names.thumb(1), names.thumb(2)]} lengths={BODY.thumb.segments} radius={radius * 1.08} />
      </group>
      <group name={names.grip} position={[0, -palmLength * 0.8 - WRIST_GAP, -palmThickness]} />
    </group>
  );
}
