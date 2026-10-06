"use client";

// ?debug=1 only: orbit the camera, jump to fixed angles, see the frame rate, play each scene of the
// choreography by hand, and freeze the joints in test poses (blink, mouth shapes, fingers).
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useSyncExternalStore, type ComponentRef, type RefObject } from "react";
import { cn } from "@/lib/cn";
import type { SceneName } from "./choreography";
import { clonePose, type RobotPose } from "./pose";
import { DEBUG_VIEWS, REST_POSE, type CameraView } from "./robotConstants";

const SCENES: Array<{ scene: SceneName; label: string }> = [
  { scene: "read", label: "Pick up and read" },
  { scene: "speak", label: "Look up and speak" },
  { scene: "putBack", label: "Put paper back" },
  { scene: "rest", label: "Rest" },
];

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
  smile: { label: "Big smile", apply: (p: RobotPose) => Object.assign(p.mouth, { smile: 1 }) },
  frown: {
    label: "Frown",
    apply: (p: RobotPose) => {
      Object.assign(p.mouth, { smile: -0.8 });
      Object.assign(p.brows, { tilt: 0.3, raise: 0.004 });
    },
  },
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
      fpsRef.current.textContent = `${Math.round(counter.count / counter.time)} fps`;
      counter.count = 0;
      counter.time = 0;
    }
  });

  return <OrbitControls ref={controlsRef} makeDefault enableDamping />;
}

interface DebugPanelProps {
  view: CameraView;
  onView: (view: CameraView) => void;
  tests: ReadonlySet<PoseTest>;
  onToggle: (test: PoseTest) => void;
  onScene: (scene: SceneName) => void;
  fpsRef: RefObject<HTMLSpanElement | null>;
}

const chip = "rounded-full border px-2 py-0.5 text-[11px] leading-5";

/** The buttons over the 3D view in debug mode. */
export function DebugPanel({ view, onView, tests, onToggle, onScene, fpsRef }: DebugPanelProps) {
  return (
    <div className="absolute inset-x-2 top-2 z-10 flex flex-col gap-1.5 rounded-md bg-ink/85 p-2 text-chalk">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-haze">Debug view</span>
        {(Object.keys(DEBUG_VIEWS) as CameraView[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={view === name}
            onClick={() => onView(name)}
            className={cn(chip, view === name ? "border-gold bg-gold text-ink" : "border-line")}
          >
            {DEBUG_VIEWS[name].label}
          </button>
        ))}
        <span ref={fpsRef} className="ml-auto text-[11px] text-haze tabular-nums">
          … fps
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-haze">Act</span>
        {SCENES.map(({ scene, label }) => (
          <button key={scene} type="button" onClick={() => onScene(scene)} className={cn(chip, "border-line")}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-haze">Freeze</span>
        {(Object.keys(POSE_TESTS) as PoseTest[]).map((test) => (
          <button
            key={test}
            type="button"
            aria-pressed={tests.has(test)}
            onClick={() => onToggle(test)}
            className={cn(chip, tests.has(test) ? "border-gold bg-gold text-ink" : "border-line")}
          >
            {POSE_TESTS[test].label}
          </button>
        ))}
      </div>
    </div>
  );
}
