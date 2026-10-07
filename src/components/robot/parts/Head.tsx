"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BufferGeometry, Mesh } from "three";
import { headGeometry, loadHeadMesh } from "../face/loadHead";
import { useRobotMaterials } from "../materials";
import { BODY, JOINT } from "../robotConstants";
import { Eye } from "./Eye";
import { EarDisc, ScalpSeams } from "./HeadDetails";
import { Mouth } from "./Mouth";

/**
 * The head pivots at the top of the neck: a realistic bald human face sculpted in code (its skin is
 * built in a background worker and appears when ready), with eyes, eyelids, teeth, ear discs and seams.
 */
export function Head() {
  const m = useRobotMaterials();
  const face = useRef<Mesh>(null);
  const [skin, setSkin] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    let alive = true;
    let made: BufferGeometry | null = null;
    void loadHeadMesh().then((data) => {
      if (!alive) return;
      made = headGeometry(data);
      setSkin(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, []);

  // The skin's shape changes (jaw, lips, brows) need their slots set up once the geometry is in place.
  useLayoutEffect(() => face.current?.updateMorphTargets(), [skin]);

  return (
    <group name={JOINT.head} position={[0, BODY.neckLength, 0]}>
      <group visible={skin !== null}>
        {/* No shadow casting: the face is the densest mesh, and its shadow would barely show. */}
        <mesh ref={face} name={JOINT.face} geometry={skin ?? undefined} material={m.skin} receiveShadow />
        <Eye side="left" />
        <Eye side="right" />
        <Mouth />
        <EarDisc side="left" />
        <EarDisc side="right" />
        <ScalpSeams />
      </group>
    </group>
  );
}
