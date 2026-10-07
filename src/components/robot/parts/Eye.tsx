"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, type Mesh } from "three";
import { buildLid, LID_MORPHS } from "../face/eyelids";
import { FACE } from "../face/landmarks";
import { useRobotMaterials } from "../materials";
import { JOINT, type Side } from "../robotConstants";

const E = FACE.eye;

/** The eyelid ring as a three.js geometry, with its blink and wide-open shape changes. */
function lidGeometry(side: number): BufferGeometry {
  const lid = buildLid(side);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(lid.positions, 3));
  geometry.setAttribute("color", new BufferAttribute(lid.colors, 3));
  geometry.setIndex(new BufferAttribute(lid.indices, 1));
  geometry.computeVertexNormals();
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = LID_MORPHS.map((name) => {
    const attribute = new BufferAttribute(lid.morphs[name], 3);
    attribute.name = name;
    return attribute;
  });
  return geometry;
}

/**
 * One eye: a glossy eyeball (its group turns to look around) and the eyelids around it. The lids
 * blink by sliding their skin over the eyeball (shape changes set in pose.ts).
 */
export function Eye({ side }: { side: Side }) {
  const m = useRobotMaterials();
  const s = side === "left" ? 1 : -1;
  const lid = useMemo(() => lidGeometry(s), [s]);
  const lidMesh = useRef<Mesh>(null);

  useEffect(() => () => lid.dispose(), [lid]);
  // A mesh sets up its shape-change slots when created, and R3F adds the geometry afterwards.
  useLayoutEffect(() => lidMesh.current?.updateMorphTargets(), [lid]);

  return (
    <>
      <group position={[s * E.x, E.y, E.z]}>
        <group name={side === "left" ? JOINT.eyeL : JOINT.eyeR}>
          <mesh material={m.eye}>
            <sphereGeometry args={[E.radius, 40, 28]} />
          </mesh>
        </group>
      </group>
      <mesh ref={lidMesh} name={side === "left" ? JOINT.lidL : JOINT.lidR} geometry={lid} material={m.skin} />
    </>
  );
}
