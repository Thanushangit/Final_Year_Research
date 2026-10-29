"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { loadHeadMesh } from "./face/loadHead";

/** Show the room anyway after this long, so a slow or broken download never hides the robot for good. */
const MAX_WAIT_MS = 25_000;
/** A short pause after everything loaded, so the new pieces are drawn before the cover fades. */
const SETTLE_MS = 250;

/**
 * Whether the room is fully built: the .glb models have loaded (three.js loading manager), the head's
 * skin has been made, and the canvas has drawn. Once ready it stays ready.
 */
export function useSceneReady(canvasCreated: boolean) {
  const { active, loaded, total } = useProgress();
  const [headReady, setHeadReady] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadHeadMesh().then(() => {
      if (alive) setHeadReady(true);
    });
    const timer = window.setTimeout(() => setReady(true), MAX_WAIT_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  const modelsDone = !active && loaded >= total;
  const allDone = canvasCreated && headReady && modelsDone;

  useEffect(() => {
    if (!allDone) return;
    const timer = window.setTimeout(() => setReady(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [allDone]);

  // The face counts as one more piece next to the model files.
  const progress = total > 0 ? (Math.min(loaded, total) + (headReady ? 1 : 0)) / (total + 1) * 100 : null;
  return { ready, progress };
}
