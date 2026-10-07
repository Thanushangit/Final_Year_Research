"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import { createRng } from "@/lib/mock/seeded";
import { COLORS, STUDY } from "../robotConstants";
import { Model, type ModelName } from "./Models";
import { globeTexture, shelfBackTexture } from "./textures";

const { boards, posts, depth } = STUDY.shelf;
const BOARD = 0.03;
const LEFT = posts[0];
const RIGHT = posts[posts.length - 1];
const BACK = STUDY.wallZ;

/** Spine colours: navy and black sets, cream and white paperbacks, a few warm accents. */
const SPINES = ["#1d2b45", "#24324f", "#1a1a1c", "#e6dcc6", "#efe9dd", "#5c2522", "#9c7a52", "#2e3f34", "#5b6066", "#1d2b45", "#e6dcc6"];

/** Things that stand on the shelves instead of books: bay (between posts i and i+1), board index, centre x. */
const DECOR: { kind: ModelName | "globe"; bay: number; board: number; x: number; scale?: number; turn?: number; width: number }[] = [
  // The camera sees the wall up to about x 1.9, so the decor sits in the middle bay.
  { kind: "bust", bay: 1, board: 3, x: 1.32, scale: 0.68, turn: -0.35, width: 0.28 },
  { kind: "globe", bay: 1, board: 2, x: 0.98, width: 0.3 },
  { kind: "canalPhoto", bay: 1, board: 2, x: 1.38, scale: 1.25, turn: -Math.PI / 2 + 0.25, width: 0.24 },
  { kind: "succulent", bay: 1, board: 3, x: 0.72, width: 0.2 },
  { kind: "succulent", bay: 0, board: 4, x: -0.42, scale: 1.15, turn: 1.2, width: 0.22 },
];

interface Book {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  band: boolean;
}

/** Fills every shelf with rows of upright books and the odd flat stack, around the decor. Same result every time. */
function layoutBooks(): Book[] {
  const rng = createRng(42);
  const pick = () => SPINES[Math.floor(rng.next() * SPINES.length)];
  const books: Book[] = [];
  for (let bay = 0; bay < posts.length - 1; bay++) {
    for (let board = 1; board < boards.length - 1; board++) {
      const floor = boards[board];
      const room = boards[board + 1] - BOARD - floor;
      const blocked = DECOR.filter((d) => d.bay === bay && d.board === board).map((d) => [d.x - d.width / 2, d.x + d.width / 2]);
      let x = posts[bay] + 0.04;
      const end = posts[bay + 1] - 0.04;
      while (x < end) {
        const hit = blocked.find(([a, b]) => x + 0.05 > a && x < b);
        if (hit) {
          x = hit[1] + 0.02;
          continue;
        }
        const limit = Math.min(end, ...blocked.map(([a]) => (a > x ? a : end)));
        if (rng.next() < 0.22 && limit - x > 0.3) {
          // A flat stack of 2-5 books lying on their covers.
          const width = rng.range(0.2, 0.27);
          let y = floor;
          for (let i = 0, n = 2 + Math.floor(rng.next() * 4); i < n; i++) {
            const thick = rng.range(0.025, 0.045);
            const d = rng.range(0.15, 0.2);
            books.push({ position: [x + width / 2 + rng.range(-0.01, 0.01), y + thick / 2, BACK + 0.03 + d / 2], size: [width - rng.range(0, 0.03), thick, d], color: pick(), band: false });
            y += thick;
          }
          x += width + rng.range(0.03, 0.08);
          continue;
        }
        // A run of upright books, sometimes a matching set.
        const set = rng.next() < 0.35 ? pick() : null;
        for (let i = 0, n = 4 + Math.floor(rng.next() * 9); i < n && x < limit - 0.025; i++) {
          const thick = Math.min(rng.range(0.022, 0.05), limit - x);
          const h = Math.min(room - 0.02, set ? 0.27 : rng.range(0.19, 0.33));
          const d = rng.range(0.15, 0.22);
          books.push({ position: [x + thick / 2, floor + h / 2, BACK + 0.03 + d / 2], size: [thick, h, d], color: set ?? pick(), band: rng.next() < 0.4 });
          x += thick + 0.001;
        }
        x += rng.range(0.01, 0.1);
      }
    }
  }
  return books;
}

/** Every book as one instanced mesh, plus thin gold title bands on some spines. */
function Books() {
  const books = useMemo(() => layoutBooks(), []);
  const banded = useMemo(() => books.filter((b) => b.band), [books]);
  const spines = useRef<InstancedMesh>(null);
  const bands = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const color = new Color();
    books.forEach((book, i) => {
      matrix.compose(new Vector3(...book.position), turn, new Vector3(...book.size));
      spines.current?.setMatrixAt(i, matrix);
      spines.current?.setColorAt(i, color.set(book.color));
    });
    banded.forEach((book, i) => {
      const [x, y, z] = book.position;
      const [w, h, d] = book.size;
      matrix.compose(new Vector3(x, y + h * 0.28, z + 0.0008), turn, new Vector3(w * 1.02, 0.012, d));
      bands.current?.setMatrixAt(i, matrix);
    });
    for (const mesh of [spines.current, bands.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [books, banded]);

  return (
    <group>
      <instancedMesh ref={spines} args={[undefined, undefined, books.length]}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={bands} args={[undefined, undefined, banded.length]}>
        <boxGeometry />
        <meshStandardMaterial color={COLORS.gold} metalness={0.7} roughness={0.4} />
      </instancedMesh>
    </group>
  );
}

function Globe({ position }: { position: [number, number, number] }) {
  const map = useMemo(() => globeTexture(), []);
  return (
    <group position={position}>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.016, 32]} />
        <meshStandardMaterial color="#2a2118" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.008, 0.012, 0.08, 12]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.35} />
      </mesh>
      <group position={[0, 0.2, 0]} rotation={[0, 0.5, 0.41]}>
        <mesh>
          <sphereGeometry args={[0.12, 48, 32]} />
          <meshStandardMaterial map={map} roughness={0.35} metalness={0.1} />
        </mesh>
        {/* The brass meridian ring. */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.132, 0.005, 8, 64]} />
          <meshStandardMaterial color={COLORS.gold} metalness={0.85} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** The walnut bookshelf on the back wall, lit by warm LED strips under each board. */
export function Bookshelf() {
  const back = useMemo(() => shelfBackTexture(), []);
  const width = RIGHT - LEFT;
  const top = boards[boards.length - 1];
  const centreX = (LEFT + RIGHT) / 2;
  const frontZ = BACK + depth;
  return (
    <group>
      <mesh position={[centreX, (boards[0] + top) / 2, BACK + 0.004]}>
        <planeGeometry args={[width, top - boards[0]]} />
        <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveMap={back} emissiveIntensity={1} roughness={1} />
      </mesh>
      {boards.map((y) => (
        <mesh key={y} position={[centreX, y - BOARD / 2, BACK + depth / 2]}>
          <boxGeometry args={[width + 0.04, BOARD, depth]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.6} />
        </mesh>
      ))}
      {posts.map((x) => (
        <mesh key={x} position={[x, (boards[0] + top) / 2, BACK + depth / 2]}>
          <boxGeometry args={[0.04, top - boards[0] + BOARD, depth]} />
          <meshStandardMaterial color={COLORS.shelfWood} roughness={0.6} />
        </mesh>
      ))}
      {/* The LED strip under the front of each board. */}
      {boards.slice(1).map((y) => (
        <mesh key={y} position={[centreX, y - BOARD - 0.003, frontZ - 0.035]}>
          <boxGeometry args={[width - 0.04, 0.005, 0.012]} />
          <meshBasicMaterial color={COLORS.shelfGlow} toneMapped={false} />
        </mesh>
      ))}
      <Books />
      <Suspense fallback={null}>
        {DECOR.map((d) => {
          const y = boards[d.board];
          const z = BACK + depth / 2 + 0.02;
          if (d.kind === "globe") return <Globe key={d.x} position={[d.x, y, z]} />;
          return <Model key={d.x} name={d.kind} position={[d.x, y, z]} rotation={[0, d.turn ?? 0, 0]} scale={d.scale ?? 1} />;
        })}
      </Suspense>
      {/* The strips' warm light on the books (one light for the whole shelf). */}
      <pointLight position={[1.1, 1.7, BACK + 0.75]} intensity={2.2} distance={3.2} decay={2} color={COLORS.shelfGlow} />
    </group>
  );
}
