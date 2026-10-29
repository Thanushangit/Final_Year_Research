"use client";

// Ready-made props from Poly Haven (CC0, public/models/CREDITS.md), packed as small .glb files.
import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import type { Mesh, Object3D } from "three";

const MODELS = {
  bigPlant: "/models/potted_plant_02.glb", // 0.84 m tall, pot 0.47 m wide
  succulent: "/models/potted_plant_04.glb", // 0.27 m tall
  bust: "/models/marble_bust_01.glb", // 0.52 m tall
  canalPhoto: "/models/standing_picture_frame_01.glb", // 0.25 m tall, faces +x
  palacePhoto: "/models/hanging_picture_frame_02.glb", // 0.75 × 0.5 m, faces +z
} as const;

export type ModelName = keyof typeof MODELS;

/** A failed download is tried again this many times, a little later each time. */
const RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function prepare(object: Object3D, castShadow: boolean): Object3D {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = castShadow;
    // The frames' glass needs a reflection map to look like glass; without one it renders black over the photo.
    if (!Array.isArray(mesh.material) && mesh.material.name.endsWith("_glass")) mesh.visible = false;
  });
  return object;
}

interface RetryProps {
  path: string;
  children: ReactNode;
}

/**
 * Catches a failed model download so it never takes the rest of the room down, forgets the failed
 * result and tries again. After the last try the model is simply left out.
 */
class RetryOnError extends Component<RetryProps, { failures: number; waiting: boolean }> {
  state = { failures: 0, waiting: false };
  private timer: number | undefined;

  static getDerivedStateFromError() {
    return { waiting: true };
  }

  componentDidCatch(error: unknown) {
    const failures = this.state.failures + 1;
    console.warn(`Could not load ${this.props.path} (try ${failures} of ${RETRIES + 1}).`, error);
    useGLTF.clear(this.props.path);
    if (failures > RETRIES) {
      this.setState({ failures });
      return;
    }
    this.timer = window.setTimeout(() => this.setState({ failures, waiting: false }), RETRY_DELAY_MS * failures);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return this.state.waiting ? null : this.props.children;
  }
}

interface ModelProps {
  name: ModelName;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
  /** Only things on the desk cast shadows (the lamp's shadow map covers the desk). */
  castShadow?: boolean;
}

function LoadedModel({ name, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, castShadow = false }: ModelProps) {
  const { scene } = useGLTF(MODELS[name], false);
  const object = useMemo(() => prepare(scene.clone(true), castShadow), [scene, castShadow]);
  return <primitive object={object} position={position} rotation={rotation} scale={scale} />;
}

/** One placed copy of a model. Each use gets its own clone, so a model can appear more than once. */
export function Model(props: ModelProps) {
  return (
    <RetryOnError path={MODELS[props.name]}>
      <Suspense fallback={null}>
        <LoadedModel {...props} />
      </Suspense>
    </RetryOnError>
  );
}

for (const path of Object.values(MODELS)) useGLTF.preload(path, false);
