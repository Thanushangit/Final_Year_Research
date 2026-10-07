"use client";

// The study room behind the desk, after the study-room reference: warm plaster walls, an oak floor,
// a lit bookshelf behind the robot, a bright window, a framed photo and a big plant on a low cabinet.
import { Suspense, useMemo } from "react";
import { COLORS, STUDY } from "../robotConstants";
import { Bookshelf } from "./Bookshelf";
import { Chair } from "./Chair";
import { Model } from "./Models";
import { windowTexture } from "./textures";

const BACK = STUDY.wallZ;

function Walls() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2, BACK]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.95} />
      </mesh>
      {/* Skirting board. */}
      <mesh position={[0, 0.05, BACK + 0.008]}>
        <boxGeometry args={[12, 0.1, 0.016]} />
        <meshStandardMaterial color="#e9e1d3" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** A tall window with a dark frame and a cross bar; the glass shows a bright, blurred garden. */
function Window() {
  const view = useMemo(() => windowTexture(), []);
  const [x, y] = STUDY.window.centre;
  const [w, h] = STUDY.window.size;
  const bar = (key: string, position: [number, number, number], size: [number, number, number]) => (
    <mesh key={key} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#2b2622" roughness={0.5} />
    </mesh>
  );
  return (
    <group position={[x, y, BACK]}>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={view} toneMapped={false} />
      </mesh>
      {bar("top", [0, h / 2, 0.025], [w + 0.08, 0.05, 0.05])}
      {bar("bottom", [0, -h / 2, 0.025], [w + 0.08, 0.05, 0.05])}
      {bar("left", [-w / 2, 0, 0.025], [0.05, h, 0.05])}
      {bar("right", [w / 2, 0, 0.025], [0.05, h, 0.05])}
      {bar("mid", [0, 0, 0.02], [0.025, h, 0.03])}
      {bar("cross", [0, h * 0.12, 0.02], [w, 0.025, 0.03])}
      {/* Sill. */}
      <mesh position={[0, -h / 2 - 0.035, 0.07]}>
        <boxGeometry args={[w + 0.16, 0.025, 0.14]} />
        <meshStandardMaterial color="#e9e1d3" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** A low walnut cabinet under the window, with the big plant and a few books on it. */
function Cabinet() {
  const [cx, cz] = STUDY.cabinet.centre;
  const [w, h, d] = STUDY.cabinet.size;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, h / 2 + 0.04, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={COLORS.shelfWood} roughness={0.55} />
      </mesh>
      {/* The seam between the two doors, and brass pulls. */}
      <mesh position={[0, h / 2 + 0.04, d / 2 + 0.001]}>
        <planeGeometry args={[0.006, h - 0.06]} />
        <meshStandardMaterial color="#1f140d" />
      </mesh>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, h * 0.62, d / 2 + 0.01]}>
          <boxGeometry args={[0.012, 0.09, 0.012]} />
          <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <Model name="bigPlant" position={[-0.25, h + 0.04, 0]} rotation={[0, 0.6, 0]} scale={1.05} />
      </Suspense>
      {[
        { size: [0.26, 0.05, 0.19], color: "#1d2b45", y: 0 },
        { size: [0.24, 0.04, 0.18], color: "#e6dcc6", y: 0.05 },
      ].map((book) => (
        <mesh key={book.color} position={[0.38, h + 0.04 + book.y + book.size[1] / 2, 0.02]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={book.size as [number, number, number]} />
          <meshStandardMaterial color={book.color} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

/** Everything around the desk. The ready-made models stream in; the room shows at once. */
export function StudyRoom() {
  const [px, py] = STUDY.picture.position;
  return (
    <group>
      <Walls />
      <Window />
      <Bookshelf />
      <Chair />
      <Cabinet />
      <Suspense fallback={null}>
        <Model name="palacePhoto" position={[px, py, BACK]} scale={STUDY.picture.scale} />
      </Suspense>
      {/* Daylight from the window side, so the room reads bright and the robot's left side is lit. */}
      <directionalLight position={[-3, 2.8, 1.2]} intensity={1.1} color="#fff4e2" />
    </group>
  );
}
