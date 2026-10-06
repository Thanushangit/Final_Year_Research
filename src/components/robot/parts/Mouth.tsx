"use client";

import { useEffect, useMemo } from "react";
import { createLipGeometry } from "../lipGeometry";
import { useRobotMaterials } from "../materials";
import { BODY, JOINT } from "../robotConstants";

/** Upper lip on the face; lower lip on the jaw, which hinges open behind the mouth. */
export function Mouth() {
  const m = useRobotMaterials();
  const upper = useMemo(() => createLipGeometry("upper"), []);
  const lower = useMemo(() => createLipGeometry("lower"), []);
  useEffect(
    () => () => {
      upper.dispose();
      lower.dispose();
    },
    [upper, lower],
  );
  const { mouth, jawPivot } = BODY;

  return (
    <>
      <mesh name={JOINT.mouthInside} position={[0, mouth.y - 0.002, mouth.z + 0.0055]} scale={[1, 0.08, 1]} material={m.mouthInside}>
        <circleGeometry args={[0.036, 32]} />
      </mesh>
      <mesh name={JOINT.upperLip} geometry={upper} material={m.lip} position={[0, mouth.y, mouth.z]} />
      <group name={JOINT.jaw} position={[0, jawPivot.y, jawPivot.z]}>
        <mesh name={JOINT.lowerLip} geometry={lower} material={m.lip} position={[0, mouth.y - jawPivot.y, mouth.z - jawPivot.z]} />
      </group>
    </>
  );
}
