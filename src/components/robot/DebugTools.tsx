"use client";

// ?debug=1 only: the debug flag, the test poses, and the orbit camera with fixed angles and an FPS
// readout. The buttons that control them are in DebugPanel.tsx.
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore, type ComponentRef, type RefObject } from "react";
import { clonePose, type RobotPose } from "./pose";
import { DEBUG_VIEWS, REST_POSE, type CameraView } from "./robotConstants";

const subscribe = () => () => {};

/** True when the page address has ?debug=1. */
export function useDebugMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    () => false,
  );
}

/** Pose tests: each one changes a copy of the resting pose. */
export const POSE_TESTS = {
  blink: { label: "Blink", apply: (p: RobotPose) => Object.assign(p.lids, { upper: 1, lower: 1 }) },
  open: { label: "Open mouth", apply: (p: RobotPose) => Object.assign(p.mouth, { open: 1 }) },
  smile: { label: "Big smile", apply: (p: RobotPose) => Object.assign(p.mouth, { smile: 1, cheek: 1 }) },
  frown: {
    label: "Frown",
    apply: (p: RobotPose) => {
      Object.assign(p.mouth, { frown: 1, smile: 0 });
      Object.assign(p.brows, { tilt: 0.3, raise: 0.004 });
    },
  },
  sneer: { label: "Sneer", apply: (p: RobotPose) => Object.assign(p.mouth, { sneer: 1, smile: 0 }) },
  stretch: { label: "Stretch lips", apply: (p: RobotPose) => Object.assign(p.mouth, { stretch: 1, smile: 0 }) },
  round: { label: "Round lips", apply: (p: RobotPose) => Object.assign(p.mouth, { round: 1, open: 0.45, smile: 0 }) },
  wide: { label: "Wide lips", apply: (p: RobotPose) => Object.assign(p.mouth, { wide: 1, open: 0.3, smile: 0 }) },
  fist: {
    label: "Curl fingers",
    apply: (p: RobotPose) => {
      Object.assign(p.armL, { curl: 1, thumb: 1 });
      Object.assign(p.armR, { curl: 1, thumb: 1 });
    },
  },
  hold: {
    label: "Hold up hands",
    apply: (p: RobotPose) => {
      for (const arm of [p.armL, p.armR]) Object.assign(arm, { shoulder: [-1.15, 0, 0.2], elbow: -0.95, wrist: [-0.15, 0, 0], curl: 0.55 });
    },
  },
} as const;

export type PoseTest = keyof typeof POSE_TESTS;

export function poseWithTests(tests: ReadonlySet<PoseTest>): RobotPose {
  const pose = clonePose(REST_POSE);
  for (const test of tests) POSE_TESTS[test].apply(pose);
  return pose;
}

/** Orbit controls plus the fixed angles and an FPS readout. Lives inside the <Canvas>. */
export function DebugCamera({ view, fpsRef }: { view: CameraView; fpsRef: RefObject<HTMLSpanElement | null> }) {
  const pending = useRef<CameraView | null>(view);
  const frames = useRef({ count: 0, time: 0 });
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    pending.current = view;
  }, [view]);

  useFrame((state, delta) => {
    // Jump to a chosen angle on the next frame (the controls exist by then).
    const controls = controlsRef.current;
    if (pending.current && controls) {
      const { position, target } = DEBUG_VIEWS[pending.current];
      state.camera.position.set(...position);
      controls.target.set(...target);
      controls.update();
      pending.current = null;
    }
    const counter = frames.current;
    counter.count += 1;
    counter.time += delta;
    if (counter.time >= 0.5 && fpsRef.current) {
      const triangles = Math.round(state.gl.info.render.triangles / 1000);
      fpsRef.current.textContent = `${Math.round(counter.count / counter.time)} fps · ${triangles}k triangles`;
      counter.count = 0;
      counter.time = 0;
    }
  });

  return <OrbitControls ref={controlsRef} makeDefault enableDamping />;
}
