// Layer A, choreography: follows the pipeline and plays the matching GSAP scene (see choreography.ts).
import { useEffect, useState, type RefObject } from "react";
import { usePipelineStore, type PipelineStore } from "@/store/pipelineStore";
import type { Stage } from "@/types";
import { Choreographer, type SceneName } from "./choreography";
import type { LineSpot } from "./Paper";

/** ?debug=1 can play a scene by hand; `nonce` makes pressing the same button again replay it. */
export interface DebugScene {
  scene: SceneName;
  nonce: number;
}

function sceneFor(stage: Stage): SceneName {
  switch (stage) {
    case "understanding":
    case "handoff":
      return "read";
    // The packet has reached VITS: the robot thinks while the voice is made.
    case "speaking":
      return "think";
    case "playing":
      return "speak";
    case "done":
      return "putBack";
    default:
      return "rest";
  }
}

interface TimelineOptions {
  /** Where the lines of text are on the page, kept up to date by <Paper>. */
  lines: RefObject<LineSpot[]>;
  onBlink: () => void;
  debugScene?: DebugScene | null;
}

export function useRobotTimeline({ lines, onBlink, debugScene }: TimelineOptions): Choreographer {
  const [choreographer] = useState(() => new Choreographer());

  useEffect(() => {
    const follow = (state: PipelineStore, previous?: PipelineStore) => {
      const scene = sceneFor(state.stage);
      const restart =
        previous === undefined ||
        scene !== choreographer.scene ||
        (scene === "read" && state.runId !== previous.runId) ||
        (scene === "speak" && state.speakRequest !== previous.speakRequest);
      if (restart) {
        const request = state.speakRequest;
        choreographer.play(scene, {
          lines: lines.current,
          onBlink,
          onReady: () => usePipelineStore.getState().markRobotReady(request),
        });
      }
      if (previous === undefined || state.speed !== previous.speed) choreographer.setSpeed(state.speed);
    };
    follow(usePipelineStore.getState());
    const unsubscribe = usePipelineStore.subscribe(follow);
    return () => {
      unsubscribe();
      choreographer.stop();
    };
  }, [choreographer, lines, onBlink]);

  useEffect(() => {
    if (debugScene) choreographer.play(debugScene.scene, { lines: lines.current, onBlink });
  }, [choreographer, debugScene, lines, onBlink]);

  return choreographer;
}
