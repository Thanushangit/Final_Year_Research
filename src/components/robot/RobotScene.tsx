"use client";

// The reading room: the robot at its desk in a bright study (bookshelf, window, plants), under a warm lamp,
// with the paper with the sentence and soft shadows.
import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Vector3, type Group } from "three";
import { usePipelineStore } from "@/store/pipelineStore";
import type { SceneName } from "./choreography";
import { DebugPanel } from "./DebugPanel";
import { DebugCamera, poseWithTests, useDebugMode, type PoseTest } from "./DebugTools";
import { Desk } from "./Desk";
import { Paper, type LineSpot } from "./Paper";
import { Robot } from "./Robot";
import { DeskProps } from "./room/DeskProps";
import { StudyRoom } from "./room/StudyRoom";
import { CAMERA, COLORS, type CameraView } from "./robotConstants";
import type { DebugScene } from "./useRobotTimeline";

// 2 × tan(fov / 2): how wide the view is at 1 m from the camera.
const VIEW_WIDTH_PER_METRE = 2 * Math.tan(((CAMERA.fov / 2) * Math.PI) / 180);

/** A slight three-quarter view that steps back on narrow frames so the robot and desk always fit. */
function CameraRig() {
  const reduceMotion = useReducedMotion();
  const goal = useRef(new Vector3());
  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(1, state.size.height);
    const distance = Math.max(CAMERA.baseDistance, CAMERA.fitWidth / (VIEW_WIDTH_PER_METRE * aspect));
    const [tx, ty, tz] = CAMERA.target;
    goal.current.set(
      tx + Math.sin(CAMERA.azimuth) * distance,
      CAMERA.baseHeight + (distance - CAMERA.baseDistance) * 0.12,
      tz + Math.cos(CAMERA.azimuth) * distance,
    );
    if (reduceMotion) state.camera.position.copy(goal.current);
    else state.camera.position.lerp(goal.current, 1 - Math.exp(-4 * delta));
    state.camera.lookAt(tx, ty, tz);
  });
  return null;
}

function NoWebGl() {
  return (
    <p className="flex h-full items-center justify-center p-6 text-center text-sm text-haze">
      The 3D robot needs WebGL, which this browser has turned off. The rest of the demo still works.
    </p>
  );
}

export default function RobotScene() {
  const debug = useDebugMode();
  const input = usePipelineStore((s) => s.input);
  const [view, setView] = useState<CameraView>("threeQuarter");
  const [tests, setTests] = useState<ReadonlySet<PoseTest>>(() => new Set());
  const [debugScene, setDebugScene] = useState<DebugScene | null>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const paper = useRef<Group>(null);
  const lines = useRef<LineSpot[]>([]);
  const testPose = useMemo(() => (tests.size > 0 ? poseWithTests(tests) : null), [tests]);
  const onLayout = useCallback((spots: LineSpot[]) => {
    lines.current = spots;
  }, []);

  const toggle = (test: PoseTest) =>
    setTests((current) => {
      const next = new Set(current);
      if (!next.delete(test)) next.add(test);
      return next;
    });
  const act = (scene: SceneName) => setDebugScene((last) => ({ scene, nonce: (last?.nonce ?? 0) + 1 }));

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0.95, 1.55, 2.75], fov: CAMERA.fov }}
        fallback={<NoWebGl />}
      >
        <color attach="background" args={[COLORS.wall]} />
        {debug ? <DebugCamera view={view} fpsRef={fpsRef} /> : <CameraRig />}
        {/* A bright, warm study: soft room light from above, plus the window light (in StudyRoom). */}
        <ambientLight intensity={0.5} color="#fff1e0" />
        <hemisphereLight args={["#fff3e3", COLORS.floor, 0.85]} />
        {/* A cool fill from the camera side keeps the face readable away from the lamp. */}
        <directionalLight position={[2.5, 2.2, 3]} intensity={0.45} color="#c9d6ff" />
        <StudyRoom />
        <ContactShadows position={[0, 0.002, 0.1]} scale={[3.2, 2.4]} far={1} blur={2.6} opacity={0.7} resolution={512} frames={1} />
        <Desk />
        <DeskProps />
        <Paper ref={paper} text={input} onLayout={onLayout} />
        <Robot paper={paper} lines={lines} testPose={testPose} debugScene={debugScene} />
      </Canvas>
      {debug && (
        <DebugPanel view={view} onView={setView} tests={tests} onToggle={toggle} onScene={act} fpsRef={fpsRef} />
      )}
    </div>
  );
}
