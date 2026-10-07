"use client";

import { RoundedBox } from "@react-three/drei";
import { useRobotMaterials } from "../materials";
import { BODY, armJoint, type Side } from "../robotConstants";

const WRIST_GAP = 0.012;
const KNUCKLES_Y = -BODY.palm.size[1] - WRIST_GAP + 0.002;
/** The plates on the back of the hand, in metres down from the wrist (the knuckle plate is a little narrower). */
const BACK_PLATES = [
  { from: 0.001, to: 0.045, inset: 0 },
  { from: 0.047, to: BODY.palm.size[1] - 0.002, inset: 0.004 },
];
/** Finger lengths compared with the middle finger: index, middle, ring, little. */
const FINGER_SCALE = [0.93, 1, 0.96, 0.8];

/** The black gap left at each joint, so the joint shows between the white segments (as in the reference). */
const JOINT_GAP = 0.0017;
const BARREL: [number, number, number] = [0, 0, Math.PI / 2]; // turns a cylinder to lie across the finger

/**
 * One finger segment hanging from its joint: a black barrel-shaped joint, a little wider than the
 * finger, then a chunky white shell that stops short of the next joint. The tip segment is rounded off.
 */
function Segment({ length, radius, tip = false }: { length: number; radius: number; tip?: boolean }) {
  const m = useRobotMaterials();
  const shell = tip ? length + radius * 0.35 - JOINT_GAP : length - 2 * JOINT_GAP;
  return (
    <>
      <mesh material={m.mech} rotation={BARREL}>
        <cylinderGeometry args={[radius * 0.86, radius * 0.86, radius * 2.15, 14]} />
      </mesh>
      <RoundedBox
        args={[radius * 2, shell, radius * 1.9]}
        radius={Math.min(tip ? radius * 0.85 : radius * 0.55, shell / 2 - 0.0002)}
        smoothness={tip ? 3 : 2}
        position={[0, -JOINT_GAP - shell / 2, 0]}
        material={m.armor}
        castShadow
      />
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
          <Segment length={lengths[2]} radius={radius * 0.9} tip />
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
      {/* The back of the hand: a plate from the wrist, and a second plate over the knuckles, with a seam between. */}
      {BACK_PLATES.map(({ from, to, inset }) => (
        <RoundedBox
          key={from}
          args={[palmWidth - inset, to - from, 0.012]}
          radius={0.005}
          smoothness={3}
          position={[0, -WRIST_GAP - (from + to) / 2, palmThickness / 2 - 0.002]}
          material={m.armor}
          castShadow
        />
      ))}
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
