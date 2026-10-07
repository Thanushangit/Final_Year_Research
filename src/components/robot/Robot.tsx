"use client";

// The whole robot. Parts are plain JSX with named joint groups; this component finds the joints once,
// then, in one useFrame, adds the motion layers together and writes the pose onto them.
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { EMOTIONS, type Emotion } from "@/lib/api/contracts";
import { EMOTION_HEX } from "@/lib/emotions";
import { usePipelineStore, type PipelineStore } from "@/store/pipelineStore";
import { EmotionBlend } from "./emotionPose";
import { RobotMaterialsProvider, useCreateRobotMaterials } from "./materials";
import { MotionMixer, placePaper } from "./motionMixer";
import type { LineSpot } from "./Paper";
import { Arm } from "./parts/Arm";
import { Head } from "./parts/Head";
import { Neck } from "./parts/Neck";
import { Torso } from "./parts/Torso";
import { applyPose, collectRig, type RobotPose, type RobotRig } from "./pose";
import { BODY, COLORS, EMOTION_REVEAL_STEP, JOINT, ROOM } from "./robotConstants";
import { useIdleMotion } from "./useIdleMotion";
import { useLipSync } from "./useLipSync";
import { useRobotTimeline, type DebugScene } from "./useRobotTimeline";

const GLOW = Object.fromEntries(EMOTIONS.map((emotion) => [emotion, new Color(EMOTION_HEX[emotion])])) as Record<Emotion, Color>;
const GOLD = new Color(COLORS.gold);

/** The face and chest show the emotion once the presenter reaches "Predicted emotion" (or later). */
function shownEmotion(state: PipelineStore) {
  const revealed = state.stage !== "understanding" || state.bertStep >= EMOTION_REVEAL_STEP;
  return revealed ? state.emotion : null;
}

/** The core behind the stomach slats glows in the predicted emotion's colour and pulses with the voice. */
function glowChest(panel: Mesh | undefined, colour: Color, level: number, delta: number) {
  const glow = panel?.material as MeshStandardMaterial | undefined;
  if (!glow) return;
  glow.emissive.lerp(colour, 1 - Math.exp(-3 * delta));
  glow.emissiveIntensity = 2 + level * 14;
}

interface RobotProps {
  /** The paper's group: the robot picks it up and puts it back. */
  paper: RefObject<Group | null>;
  /** Where the lines of text are on the paper, so the eyes can follow them. */
  lines: RefObject<LineSpot[]>;
  /** ?debug=1: a fixed test pose that replaces all motion. */
  testPose?: RobotPose | null;
  /** ?debug=1: play one scene by hand. */
  debugScene?: DebugScene | null;
}

export function Robot({ paper, lines, testPose, debugScene }: RobotProps) {
  const materials = useCreateRobotMaterials();
  const root = useRef<Group>(null);
  const rig = useRef<RobotRig | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const idle = useIdleMotion();
  const lipSync = useLipSync();
  const choreo = useRobotTimeline({ lines, onBlink: idle.requestBlink, debugScene });
  const [emotion] = useState(() => new EmotionBlend());
  const [mixer] = useState(() => new MotionMixer());
  const setRobotOnline = usePipelineStore((s) => s.setRobotOnline);

  useLayoutEffect(() => {
    if (root.current) rig.current = collectRig(root.current);
  }, []);

  // Tells the voice to wait for the robot to look up before it starts.
  useEffect(() => {
    setRobotOnline(true);
    return () => setRobotOnline(false);
  }, [setRobotOnline]);

  useFrame((state, delta) => {
    const current = rig.current;
    if (!current) return;
    const shown = shownEmotion(usePipelineStore.getState());
    if (testPose) {
      applyPose(current, testPose);
      if (paper.current) placePaper(paper.current, undefined, 0, 0);
    } else {
      mixer.step(
        { choreo, emotion, idle, lipSync },
        {
          rig: current,
          paper: paper.current,
          camera: state.camera,
          canvas: state.gl.domElement,
          delta,
          scores: shown?.probabilities ?? null,
          reducedMotion,
        },
      );
    }
    glowChest(current.chestPanel, shown ? GLOW[shown.predictedEmotion] : GOLD, lipSync.level, delta);
  });

  return (
    <RobotMaterialsProvider value={materials}>
      <group ref={root} name="robot" position={[0, 0, ROOM.robotZ]}>
        <group position={[0, BODY.waistY, 0]}>
          <group name={JOINT.spine}>
            <Torso />
            <group name={JOINT.chest}>
              <group name={JOINT.neck} position={[0, BODY.neckY, 0]}>
                <Neck />
                <Head />
              </group>
              <Arm side="left" />
              <Arm side="right" />
            </group>
          </group>
        </group>
      </group>
    </RobotMaterialsProvider>
  );
}
