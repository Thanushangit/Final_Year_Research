"use client";

// An arm from the reference: a big helmet-like shoulder cap over a black bearing with concentric rings,
// two-piece white shells over a dark core on the upper arm and forearm, a black elbow mechanism and a
// white wrist cuff. Joints are groups at their pivots; the right arm's shells are the left's mirrored.
import { useEffect, useMemo, type ReactNode } from "react";
import { useRobotMaterials } from "../materials";
import { BODY, armJoint, type Side } from "../robotConstants";
import { cable, shellPiece, type Point2 } from "../shapes";
import { Hand } from "./Hand";

// Shoulder cap profile: distance from its axis and height along it (the axis points out of the shoulder).
const CAP_TOP: Point2[] = [[0.001, 0.078], [0.03, 0.074], [0.05, 0.063]];
const CAP_SIDE: Point2[] = [[0.054, 0.059], [0.073, 0.035], [0.082, 0], [0.084, -0.03]];
const CAP_OPENING = 1.5; // radians left open underneath, where the upper arm comes out
const UPPER_ARM: Point2[] = [[0.047, -0.035], [0.054, -0.07], [0.057, -0.11], [0.054, -0.155], [0.047, -0.2], [0.043, -0.222]];
const FOREARM: Point2[] = [[0.05, -0.025], [0.054, -0.055], [0.051, -0.1], [0.045, -0.16], [0.039, -0.205], [0.037, -0.222]];

function useArmShapes() {
  const shapes = useMemo(() => {
    const capStart = Math.PI / 2 + CAP_OPENING / 2;
    const capLength = Math.PI * 2 - CAP_OPENING;
    return {
      capTop: shellPiece(CAP_TOP, 0.009, capStart, capLength, 40),
      capSide: shellPiece(CAP_SIDE, 0.009, capStart, capLength, 40),
      // Front and back halves of the upper arm, with thin seams between them.
      upperFront: shellPiece(UPPER_ARM, 0.007, -1.5, 3.0),
      upperBack: shellPiece(UPPER_ARM, 0.007, 1.56, 3.1),
      // The forearm: one big outer piece and a smaller inner one; a cable shows in the gap.
      forearmOuter: shellPiece(FOREARM, 0.007, -2.3, 4.2),
      forearmInner: shellPiece(FOREARM, 0.007, 1.98, 1.92, 16),
      forearmCable: cable([[0.031, -0.02, -0.012], [0.032, -0.1, -0.013], [0.03, -0.215, -0.012]], 0.0055, 16),
    };
  }, []);
  useEffect(() => () => Object.values(shapes).forEach((geometry) => geometry.dispose()), [shapes]);
  return shapes;
}

/** Mirrors the shells for the right arm (the joints themselves are never mirrored). */
function Shells({ mirror, children }: { mirror: number; children: ReactNode }) {
  return <group scale={[mirror, 1, 1]}>{children}</group>;
}

export function Arm({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const names = armJoint(side);
  const s = side === "left" ? 1 : -1;
  const shapes = useArmShapes();
  const { upperArm, forearm } = BODY;

  return (
    <group name={names.shoulder} position={[s * BODY.shoulderX, BODY.shoulderY, 0]}>
      <Shells mirror={s}>
        <mesh material={m.mech} castShadow>
          <sphereGeometry args={[0.052, 24, 16]} />
        </mesh>
        {/* The cap's axis points out of the shoulder and a little up. */}
        <group position={[0.004, 0.012, 0]} rotation={[0, 0, -Math.PI / 2 + 0.25]}>
          <mesh geometry={shapes.capTop} material={m.armor} castShadow />
          <mesh geometry={shapes.capSide} material={m.armor} castShadow />
        </group>
        {/* The round bearing at the front of the shoulder, facing forward and a little outward. */}
        <group position={[0.022, -0.045, 0.048]} rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, 0, -0.45]}>
            <mesh material={m.mech}>
              <cylinderGeometry args={[0.044, 0.044, 0.03, 32]} />
            </mesh>
            {[0.036, 0.025, 0.014].map((radius) => (
              <mesh key={radius} material={m.cable} position={[0, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius, 0.003, 10, 36]} />
              </mesh>
            ))}
            <mesh material={m.metal} position={[0, 0.017, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            </mesh>
          </group>
        </group>
        <mesh material={m.mech} position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.041, 0.041, 0.2, 20]} />
        </mesh>
        <mesh geometry={shapes.upperFront} material={m.armor} castShadow />
        <mesh geometry={shapes.upperBack} material={m.armor} castShadow />
      </Shells>

      <group name={names.elbow} position={[0, -upperArm.length, 0]}>
        <Shells mirror={s}>
          <mesh material={m.mech} castShadow>
            <sphereGeometry args={[0.041, 20, 14]} />
          </mesh>
          <mesh material={m.metal} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.019, 0.019, 0.098, 16]} />
          </mesh>
          <mesh material={m.cable} position={[0, 0, -0.04]}>
            <cylinderGeometry args={[0.007, 0.007, 0.11, 12]} />
          </mesh>
          <mesh material={m.mech} position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.033, 0.033, 0.2, 20]} />
          </mesh>
          <mesh geometry={shapes.forearmOuter} material={m.armor} castShadow />
          <mesh geometry={shapes.forearmInner} material={m.armor} castShadow />
          <mesh geometry={shapes.forearmCable} material={m.cable} />
          {/* The white cuff above the wrist. */}
          <mesh material={m.armor} position={[0, -forearm.length + 0.012, 0]}>
            <cylinderGeometry args={[0.04, 0.038, 0.014, 24]} />
          </mesh>
        </Shells>
        <group name={names.wrist} position={[0, -forearm.length, 0]}>
          <mesh material={m.mech}>
            <sphereGeometry args={[0.026, 16, 12]} />
          </mesh>
          <Hand side={side} />
        </group>
      </group>
    </group>
  );
}
