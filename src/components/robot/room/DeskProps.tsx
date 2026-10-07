"use client";

// Things on the desk, after the study-room reference: a stack of titled books, a black mug on a cork
// coaster, a laptop, a pen cup, a leather notebook, sticky notes and a small plant.
import { RoundedBox } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { DoubleSide, MeshStandardMaterial } from "three";
import { COLORS, ROOM, STUDY } from "../robotConstants";
import { Model } from "./Models";
import { laptopScreenTexture, spineTexture } from "./textures";

const TOP = ROOM.deskTop;

const STACK = [
  { cover: "#efe9dd", ink: "#1b2e50", size: [0.27, 0.05, 0.2] },
  { cover: "#1a1a1c", ink: "#e6dcc6", size: [0.26, 0.045, 0.19] },
  { cover: "#1b2e50", ink: "#efe9dd", size: [0.25, 0.042, 0.185] },
  { cover: "#1d2b45", ink: "#efe9dd", size: [0.26, 0.05, 0.19] },
] as const;

/** One closed book lying flat, spine (with its title) towards the room. */
function TitledBook({ title, cover, ink, size, y, turn }: { title: string; cover: string; ink: string; size: readonly [number, number, number]; y: number; turn: number }) {
  // Box faces: +x, −x, +y, −y, +z (the spine), −z. The ends and the fore-edge show the cream pages.
  const materials = useMemo(() => {
    const pages = new MeshStandardMaterial({ color: "#eadfc6", roughness: 0.9 });
    const coverMaterial = new MeshStandardMaterial({ color: cover, roughness: 0.7 });
    const spine = new MeshStandardMaterial({ map: spineTexture(title, cover, ink), roughness: 0.65 });
    return [pages, pages, coverMaterial, coverMaterial, spine, pages];
  }, [title, cover, ink]);
  return (
    <mesh position={[0, y + size[1] / 2, 0]} rotation={[0, turn, 0]} material={materials} castShadow receiveShadow>
      <boxGeometry args={size as unknown as [number, number, number]} />
    </mesh>
  );
}

/** Where each book's underside sits: on top of the ones below it. */
const STACK_Y = STACK.map((_, i) => STACK.slice(0, i).reduce((sum, book) => sum + book.size[1], 0));

function BookStack() {
  return (
    <group position={ROOM.books.position} rotation={[0, 0.42, 0]}>
      {STACK.map((book, i) => (
        <TitledBook key={i} title={STUDY.bookTitles[i]} cover={book.cover} ink={book.ink} size={book.size} y={STACK_Y[i]} turn={(i % 2 ? -1 : 1) * 0.03} />
      ))}
    </group>
  );
}

function Mug() {
  return (
    <group position={[-0.8, TOP, 0.3]} rotation={[0, 2.4, 0]}>
      <mesh position={[0, 0.003, 0]} receiveShadow>
        <cylinderGeometry args={[0.058, 0.058, 0.006, 32]} />
        <meshStandardMaterial color="#b98a55" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.056, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.04, 0.1, 32, 1, true]} />
        <meshStandardMaterial color="#1c1b1a" roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.098, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial color="#2b1a10" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial color="#1c1b1a" />
      </mesh>
      <mesh position={[0.047, 0.058, 0]} castShadow>
        <torusGeometry args={[0.024, 0.006, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#1c1b1a" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** A thin silver laptop, open, with a waveform on the screen. */
function Laptop() {
  const screen = useMemo(() => laptopScreenTexture(), []);
  const aluminium = <meshStandardMaterial color="#a9abb0" metalness={0.65} roughness={0.32} />;
  return (
    <group position={[0.7, TOP, 0.28]} rotation={[0, -0.55, 0]}>
      <RoundedBox args={[0.31, 0.012, 0.215]} radius={0.005} smoothness={2} position={[0, 0.006, 0]} castShadow>
        {aluminium}
      </RoundedBox>
      <mesh position={[0, 0.0125, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.27, 0.1]} />
        <meshStandardMaterial color="#2a2b2e" roughness={0.6} />
      </mesh>
      {/* The lid, hinged at the back edge and opened to about 105°. */}
      <group position={[0, 0.012, -0.105]} rotation={[-0.26, 0, 0]}>
        <RoundedBox args={[0.31, 0.205, 0.007]} radius={0.004} smoothness={2} position={[0, 0.1025, 0]} castShadow>
          {aluminium}
        </RoundedBox>
        <mesh position={[0, 0.104, 0.0037]}>
          <planeGeometry args={[0.286, 0.18]} />
          <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.85} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/** A black mesh pen cup with a few pens. */
function PenCup() {
  const pens = [
    { tilt: [0.12, 0, 0.1], color: "#1a1a1c", tip: COLORS.gold },
    { tilt: [-0.1, 0, -0.12], color: COLORS.gold, tip: "#1a1a1c" },
    { tilt: [0.05, 0, -0.2], color: "#1a1a1c", tip: "#c8c8c8" },
  ] as const;
  return (
    <group position={[0.9, TOP, 0.06]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.034, 0.1, 24, 1, true]} />
        <meshStandardMaterial color="#202020" metalness={0.6} roughness={0.45} side={DoubleSide} />
      </mesh>
      {pens.map((pen) => (
        <group key={pen.color + pen.tilt[2]} rotation={pen.tilt as unknown as [number, number, number]} position={[pen.tilt[2] * -0.08, 0.075, pen.tilt[0] * 0.08]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.0045, 0.0045, 0.14, 10]} />
            <meshStandardMaterial color={pen.color} metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.072, 0]}>
            <cylinderGeometry args={[0.0046, 0.0046, 0.012, 10]} />
            <meshStandardMaterial color={pen.tip} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Notebook() {
  return (
    <group position={[-0.32, TOP, 0.4]} rotation={[0, 0.12, 0]}>
      <RoundedBox args={[0.24, 0.024, 0.17]} radius={0.006} smoothness={2} position={[0, 0.012, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5b3422" roughness={0.7} />
      </RoundedBox>
      {/* The elastic strap. */}
      <mesh position={[0.095, 0.0125, 0]}>
        <boxGeometry args={[0.008, 0.026, 0.172]} />
        <meshStandardMaterial color="#3a2116" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function DeskProps() {
  return (
    <group>
      <BookStack />
      <Mug />
      <Laptop />
      <PenCup />
      <Notebook />
      <mesh position={[0.22, TOP + 0.004, 0.42]} rotation={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.076, 0.008, 0.076]} />
        <meshStandardMaterial color="#f2e7a4" roughness={0.9} />
      </mesh>
      <Suspense fallback={null}>
        <Model name="succulent" position={[0.88, TOP, -0.22]} scale={0.9} castShadow />
      </Suspense>
    </group>
  );
}
