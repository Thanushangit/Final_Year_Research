"use client";

import { useEffect, useMemo } from "react";
import { ExtrudeGeometry, LatheGeometry, MeshPhysicalMaterial, Shape, SplineCurve, Vector2 } from "three";
import { useRobotMaterials } from "../materials";
import { BODY, COLORS, JOINT } from "../robotConstants";

// Half-width of the torso at each height above the waist, smoothed into a curve and spun round.
const PROFILE: Array<[number, number]> = [
  [0.001, 0],
  [0.12, 0.005],
  [0.15, 0.05],
  [0.163, 0.15],
  [0.178, 0.27],
  [0.184, 0.36],
  [0.175, 0.43],
  [0.145, 0.49],
  [0.09, 0.525],
  [0.001, 0.535],
];

function roundedRect(width: number, height: number, radius: number): Shape {
  const shape = new Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

const PANEL_Y = 0.31;
const PANEL_Z = 0.126; // the torso's front surface at that height

/** The ivory torso, from the waist up, with the glowing chest panel in a gold frame. */
export function Torso() {
  const m = useRobotMaterials();
  const geometries = useMemo(() => {
    const outline = new SplineCurve(PROFILE.map(([x, y]) => new Vector2(x, y))).getPoints(48);
    const bevel = { bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3 };
    return {
      body: new LatheGeometry(outline, 48),
      frame: new ExtrudeGeometry(roundedRect(0.166, 0.116, 0.024), { depth: 0.004, ...bevel }),
      panel: new ExtrudeGeometry(roundedRect(0.15, 0.1, 0.02), { depth: 0.006, ...bevel }),
    };
  }, []);
  // The chest panel has its own material because its glow colour follows the predicted emotion.
  const glass = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: COLORS.chestGlass,
        emissive: COLORS.gold,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        clearcoat: 1,
      }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      glass.dispose();
    },
    [geometries, glass],
  );

  return (
    <group>
      <mesh geometry={geometries.body} scale={BODY.torsoScale} material={m.shell} castShadow receiveShadow />
      <mesh geometry={geometries.frame} position={[0, PANEL_Y, PANEL_Z - 0.004]} material={m.gold} />
      <mesh name={JOINT.chestPanel} geometry={geometries.panel} position={[0, PANEL_Y, PANEL_Z]} material={glass} />
      {/* A navy band at the waist. */}
      <mesh
        material={m.joint}
        position={[0, 0.03, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        // Scale is applied before the turn, so the ring's local y becomes the body's depth.
        scale={[BODY.torsoScale[0], BODY.torsoScale[2], 1]}
      >
        <torusGeometry args={[0.128, 0.014, 12, 48]} />
      </mesh>
    </group>
  );
}

/** The neck from the top of the torso, with a gold collar at its base. */
export function Neck() {
  const m = useRobotMaterials();
  return (
    <>
      <mesh material={m.joint} position={[0, BODY.neckLength / 2, 0]} castShadow>
        <cylinderGeometry args={[0.036, 0.042, BODY.neckLength + 0.02, 24]} />
      </mesh>
      <mesh material={m.gold} position={[0, 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.046, 0.006, 10, 32]} />
      </mesh>
    </>
  );
}
