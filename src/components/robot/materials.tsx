"use client";

// The robot's materials, made once and shared by every part (fewer objects for the GPU to juggle).
import { createContext, useContext, useEffect, useMemo } from "react";
import { DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { COLORS } from "./robotConstants";

function createMaterials() {
  return {
    // Matte ivory shell with a light clear coat.
    shell: new MeshPhysicalMaterial({ color: COLORS.shell, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45 }),
    joint: new MeshStandardMaterial({ color: COLORS.joint, roughness: 0.45, metalness: 0.25 }),
    gold: new MeshStandardMaterial({ color: COLORS.gold, roughness: 0.32, metalness: 0.85 }),
    // The dark, glossy face plate; the eyelids use it too, so closed eyes blend into the face.
    visor: new MeshPhysicalMaterial({ color: COLORS.visor, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
    eyeWhite: new MeshStandardMaterial({ color: COLORS.eyeWhite, roughness: 0.3, emissive: COLORS.eyeWhite, emissiveIntensity: 0.12 }),
    irisRing: new MeshStandardMaterial({ color: COLORS.irisRing, roughness: 0.35, metalness: 0.3 }),
    iris: new MeshStandardMaterial({ color: COLORS.iris, roughness: 0.4, metalness: 0.2 }),
    pupil: new MeshStandardMaterial({ color: COLORS.pupil, roughness: 0.2 }),
    highlight: new MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 1 }),
    lip: new MeshPhysicalMaterial({ color: COLORS.lip, roughness: 0.55, clearcoat: 0.2, side: DoubleSide }),
    // Unlit, so the lamp's warm light never tints the inside of the mouth.
    mouthInside: new MeshBasicMaterial({ color: COLORS.mouthInside }),
  };
}

export type RobotMaterials = ReturnType<typeof createMaterials>;

const MaterialsContext = createContext<RobotMaterials | null>(null);

/** Creates the shared materials for one robot and frees them when it goes away. */
export function useCreateRobotMaterials(): RobotMaterials {
  const materials = useMemo(() => createMaterials(), []);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  return materials;
}

export const RobotMaterialsProvider = MaterialsContext.Provider;

export function useRobotMaterials(): RobotMaterials {
  const materials = useContext(MaterialsContext);
  if (!materials) throw new Error("Robot parts must be inside <Robot>.");
  return materials;
}
