"use client";

// A navy leather executive chair, after the reference: a tall back that rises above the shoulders,
// rounded top corners, vertical stitched channels with a lumbar band, and padded armrests on metal supports.
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { COLORS, STUDY } from "../robotConstants";

const { z, width, bottom, height, recline } = STUDY.chair;
const SHELL_DEPTH = 0.06;
const BEVEL = 0.025;
const CHANNELS = 4;
const LUMBAR = 0.26; // share of the back's height taken by the lumbar band

/** The back's outline: a little wider at the shoulders, big rounded top corners. */
function backShape(): Shape {
  const top = width / 2;
  const base = width / 2 - 0.04;
  const r = 0.13;
  const shape = new Shape();
  shape.moveTo(-base + 0.06, 0);
  shape.lineTo(base - 0.06, 0);
  shape.quadraticCurveTo(base, 0, base, 0.06);
  shape.lineTo(top, height - r);
  shape.quadraticCurveTo(top, height, top - r, height);
  shape.lineTo(-top + r, height);
  shape.quadraticCurveTo(-top, height, -top, height - r);
  shape.lineTo(-base, 0.06);
  shape.quadraticCurveTo(-base, 0, -base + 0.06, 0);
  return shape;
}

function Leather({ shade = COLORS.chair }: { shade?: string }) {
  return <meshPhysicalMaterial color={shade} roughness={0.45} clearcoat={0.35} clearcoatRoughness={0.4} />;
}

function Metal() {
  return <meshStandardMaterial color="#c9ccd1" metalness={0.75} roughness={0.25} />;
}

/** The stitched cushions on the front of the back: vertical channels above a lumbar band. */
function Cushions() {
  const inner = width - 0.16;
  const column = inner / CHANNELS;
  const front = SHELL_DEPTH / 2 + BEVEL + 0.012;
  const lumbar = (height - 0.14) * LUMBAR;
  const upper = height - 0.2 - lumbar;
  return (
    <group position={[0, 0, front]}>
      {Array.from({ length: CHANNELS }, (_, i) => (
        <RoundedBox
          key={i}
          args={[column - 0.008, upper, 0.035]}
          radius={0.016}
          smoothness={3}
          position={[-inner / 2 + column * (i + 0.5), 0.08 + lumbar + 0.01 + upper / 2, 0]}
        >
          <Leather />
        </RoundedBox>
      ))}
      <RoundedBox args={[inner, lumbar, 0.04]} radius={0.018} smoothness={3} position={[0, 0.08 + lumbar / 2, 0.003]}>
        <Leather />
      </RoundedBox>
    </group>
  );
}

function Armrest({ side }: { side: -1 | 1 }) {
  const x = side * (width / 2 + 0.05);
  return (
    <group position={[x, 0, 0.22]}>
      {/* A curved metal support from the seat up to the pad. */}
      <mesh position={[0, 0.58, -0.08]}>
        <boxGeometry args={[0.03, 0.12, 0.02]} />
        <Metal />
      </mesh>
      <mesh position={[0, 0.64, 0.02]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.1, 0.01, 8, 24, Math.PI]} />
        <Metal />
      </mesh>
      <RoundedBox args={[0.075, 0.035, 0.3]} radius={0.015} smoothness={3} position={[0, 0.66, 0.02]}>
        <Leather />
      </RoundedBox>
    </group>
  );
}

/** The executive chair behind the robot. Only its back and arms show above the desk. */
export function Chair() {
  const shell = useMemo(
    () => new ExtrudeGeometry(backShape(), { depth: SHELL_DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 16 }),
    [],
  );
  return (
    <group position={[0, 0, z]}>
      {/* The back reclines a little, pivoting at the seat. */}
      <group position={[0, bottom, 0]} rotation={[-recline, 0, 0]}>
        <mesh geometry={shell} position={[0, 0, -SHELL_DEPTH / 2]}>
          <Leather />
        </mesh>
        <Cushions />
        {/* A metal frame bar behind the back, down to the seat. */}
        <mesh position={[0, -0.04, -SHELL_DEPTH / 2 - BEVEL - 0.01]}>
          <boxGeometry args={[0.06, 0.2, 0.02]} />
          <Metal />
        </mesh>
      </group>
      <Armrest side={-1} />
      <Armrest side={1} />
    </group>
  );
}
