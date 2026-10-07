"use client";

// ?debug=1 only: the buttons over the 3D view. Camera angles, the frame rate, each choreography scene
// by hand (optionally in slow motion), and frozen test poses. They fold away so they don't hide the robot.
import { gsap } from "gsap";
import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/cn";
import type { SceneName } from "./choreography";
import { POSE_TESTS, type PoseTest } from "./DebugTools";
import { DEBUG_VIEWS, type CameraView } from "./robotConstants";

const SCENES: Array<{ scene: SceneName; label: string }> = [
  { scene: "read", label: "Pick up and read" },
  { scene: "think", label: "Think" },
  { scene: "speak", label: "Look up and speak" },
  { scene: "putBack", label: "Put paper back" },
  { scene: "rest", label: "Rest" },
];

const chip = "rounded-full border px-2 py-0.5 text-[11px] leading-5";
const pressed = (on: boolean) => (on ? "border-gold bg-gold text-ink" : "border-line");

/** Slows every robot move to a quarter speed, to check the timing closely. */
function SlowMotion() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    gsap.globalTimeline.timeScale(slow ? 0.25 : 1);
    return () => void gsap.globalTimeline.timeScale(1);
  }, [slow]);
  return (
    <button type="button" aria-pressed={slow} onClick={() => setSlow(!slow)} className={cn(chip, "ml-auto", pressed(slow))}>
      Slow motion
    </button>
  );
}

interface DebugPanelProps {
  view: CameraView;
  onView: (view: CameraView) => void;
  tests: ReadonlySet<PoseTest>;
  onToggle: (test: PoseTest) => void;
  onScene: (scene: SceneName) => void;
  fpsRef: RefObject<HTMLSpanElement | null>;
}

export function DebugPanel({ view, onView, tests, onToggle, onScene, fpsRef }: DebugPanelProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(chip, "absolute top-2 left-2 z-10 border-line bg-ink/85 text-chalk")}
        >
          Show debug tools
        </button>
      )}
      {/* Hidden rather than removed, so slow motion and the FPS meter keep running. */}
      <div
        className={cn(
          "absolute inset-x-2 top-2 z-10 flex flex-col gap-1.5 rounded-md bg-ink/85 p-2 text-chalk",
          !open && "hidden",
        )}
      >
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setOpen(false)} className={cn(chip, "border-line")}>
            Hide
          </button>
          <span className="mx-1 text-[11px] text-haze">Debug view</span>
          {(Object.keys(DEBUG_VIEWS) as CameraView[]).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              onClick={() => onView(name)}
              className={cn(chip, pressed(view === name))}
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
          <SlowMotion />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-haze">Freeze</span>
          {(Object.keys(POSE_TESTS) as PoseTest[]).map((test) => (
            <button
              key={test}
              type="button"
              aria-pressed={tests.has(test)}
              onClick={() => onToggle(test)}
              className={cn(chip, pressed(tests.has(test)))}
            >
              {POSE_TESTS[test].label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
