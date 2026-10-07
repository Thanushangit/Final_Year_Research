"use client";

import { useLayoutEffect, useRef } from "react";
import { DoubleSide, type SpotLight } from "three";
import { COLORS, ROOM } from "./robotConstants";

const [DESK_W, DESK_T, DESK_D] = ROOM.deskSize;
const TOP_Y = ROOM.deskTop - DESK_T / 2;
const FRONT_Z = ROOM.deskCentreZ + DESK_D / 2;

function Wood({ color = COLORS.wood, roughness = 0.62 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} />;
}

/** A small stack of books at the far end of the desk. */
function Books() {
  const books = [
    { size: [0.24, 0.045, 0.17], color: "#7a2e2a", y: 0 },
    { size: [0.22, 0.04, 0.16], color: COLORS.navy, y: 0.0425 },
    { size: [0.2, 0.035, 0.15], color: "#2f4a3e", y: 0.08 },
  ] as const;
  return (
    <group position={ROOM.books.position} rotation={[0, 0.25, 0]}>
      {books.map((book) => (
        <group key={book.color} position={[0, book.y + book.size[1] / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={book.size} />
            <meshStandardMaterial color={book.color} roughness={0.7} />
          </mesh>
          {/* A gold line on the spine. */}
          <mesh position={[0, 0, book.size[2] / 2 + 0.0005]}>
            <planeGeometry args={[book.size[0] * 0.8, 0.004]} />
            <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The lamp on the desk and the warm spotlight it throws onto the paper. */
function Lamp() {
  const light = useRef<SpotLight>(null);
  const [x, y, z] = ROOM.lamp.position;
  useLayoutEffect(() => {
    const lamp = light.current;
    if (!lamp) return;
    const [px, py, pz] = ROOM.paper.position;
    lamp.target.position.set(px, py, pz);
    lamp.target.updateMatrixWorld();
  }, []);

  return (
    <group>
      <group position={[x, y, z]}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.025, 32]} />
          <meshStandardMaterial color={COLORS.navy} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.82, 16]} />
          <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.35} />
        </mesh>
        {/* The shade's open end points down and towards the paper (−x, +z). */}
        <group position={[-0.05, 0.83, 0.04]} rotation={[-0.3, 0, -0.55]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.11, 0.13, 32, 1, true]} />
            <meshStandardMaterial color={COLORS.navy} side={DoubleSide} metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#fff2d6" emissive={COLORS.lampLight} emissiveIntensity={3} />
          </mesh>
        </group>
      </group>
      <spotLight
        ref={light}
        position={[x - 0.06, y + 0.8, z + 0.14]}
        angle={0.85}
        penumbra={0.9}
        intensity={14}
        color={COLORS.lampLight}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
      />
      {/* Warm spill from the bulb that reaches the robot's face. */}
      <pointLight position={[x - 0.1, y + 0.75, z + 0.1]} intensity={0.9} distance={2.4} decay={2} color={COLORS.lampLight} />
    </group>
  );
}

/** A walnut writing desk with a front panel (so nothing shows underneath), a leather pad and books. */
export function Desk() {
  return (
    <group>
      <mesh position={[0, TOP_Y, ROOM.deskCentreZ]} castShadow receiveShadow>
        <boxGeometry args={ROOM.deskSize} />
        <Wood />
      </mesh>
      <mesh position={[0, TOP_Y / 2, FRONT_Z - 0.03]} receiveShadow>
        <boxGeometry args={[DESK_W - 0.06, TOP_Y, 0.03]} />
        <Wood color={COLORS.woodDark} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (DESK_W / 2 - 0.04), TOP_Y / 2, ROOM.deskCentreZ]} castShadow receiveShadow>
          <boxGeometry args={[0.05, TOP_Y, DESK_D - 0.04]} />
          <Wood color={COLORS.woodDark} />
        </mesh>
      ))}
      {/* Leather writing pad under the paper. */}
      <mesh position={[0, ROOM.deskTop + 0.001, 0.02]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.95, 0.5]} />
        <meshStandardMaterial color={COLORS.leather} roughness={0.85} />
      </mesh>
      <Books />
      <Lamp />
    </group>
  );
}
