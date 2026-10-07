"use client";

// Ready-made props from Poly Haven (CC0, public/models/CREDITS.md), packed as small .glb files.
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Mesh, Object3D } from "three";

const MODELS = {
  bigPlant: "/models/potted_plant_02.glb", // 0.84 m tall, pot 0.47 m wide
  succulent: "/models/potted_plant_04.glb", // 0.27 m tall
  bust: "/models/marble_bust_01.glb", // 0.52 m tall
  canalPhoto: "/models/standing_picture_frame_01.glb", // 0.25 m tall, faces +x
  palacePhoto: "/models/hanging_picture_frame_02.glb", // 0.75 × 0.5 m, faces +z
} as const;

export type ModelName = keyof typeof MODELS;

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

interface ModelProps {
  name: ModelName;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
  /** Only things on the desk cast shadows (the lamp's shadow map covers the desk). */
  castShadow?: boolean;
}

/** One placed copy of a model. Each use gets its own clone, so a model can appear more than once. */
export function Model({ name, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, castShadow = false }: ModelProps) {
  const { scene } = useGLTF(MODELS[name], false);
  const object = useMemo(() => prepare(scene.clone(true), castShadow), [scene, castShadow]);
  return <primitive object={object} position={position} rotation={rotation} scale={scale} />;
}

for (const path of Object.values(MODELS)) useGLTF.preload(path, false);
