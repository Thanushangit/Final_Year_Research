"use client";

// The robot's materials, made once and shared by every part (fewer objects for the GPU to juggle).
// Colours were picked from the reference image.
import { createContext, useContext, useEffect, useMemo } from "react";
import { CanvasTexture, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace } from "three";
import { COLORS } from "./robotConstants";

/** The eyeball's colours, drawn once onto a canvas wrapped around the sphere (the iris faces +z). */
function eyeTexture(): CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(width, height);
    for (let py = 0; py < height; py++) {
      const theta = ((py + 0.5) / height) * Math.PI;
      for (let px = 0; px < width; px++) {
        const phi = ((px + 0.5) / width) * Math.PI * 2;
        // Same mapping as three.js SphereGeometry; the angle from straight ahead (+z) sets the colour.
        const x = -Math.cos(phi) * Math.sin(theta);
        const y = Math.cos(theta);
        const z = Math.sin(phi) * Math.sin(theta);
        const angle = Math.acos(Math.max(-1, Math.min(1, z)));
        const around = Math.atan2(y, x);
        let rgb: [number, number, number];
        if (angle < 0.2) {
          rgb = [10, 9, 8]; // pupil
        } else if (angle < 0.5) {
          // Grey iris with fine radial fibres, darker towards the rim.
          const fibres = 0.82 + 0.18 * Math.sin(around * 70 + Math.sin(around * 13) * 3) * Math.sin(angle * 40);
          const rim = angle > 0.44 ? 0.45 : 1 - (angle - 0.2) * 0.6;
          const base = angle < 0.27 ? 0.72 : 1;
          rgb = [118, 112, 104].map((c) => c * fibres * rim * base) as [number, number, number];
        } else {
          // White of the eye, a little pinker and darker towards the back.
          const t = Math.min(1, (angle - 0.5) / 1.4);
          rgb = [236 - 30 * t, 230 - 46 * t, 224 - 46 * t];
        }
        const i = (py * width + px) * 4;
        image.data[i] = rgb[0];
        image.data[i + 1] = rgb[1];
        image.data[i + 2] = rgb[2];
        image.data[i + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createMaterials() {
  return {
    // Matte off-white armour plates with a light clear coat.
    armor: new MeshPhysicalMaterial({ color: COLORS.armor, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.45 }),
    // Dark mechanics between the plates, glossy black cables, metal rings and screws.
    mech: new MeshStandardMaterial({ color: COLORS.mech, roughness: 0.5, metalness: 0.45 }),
    cable: new MeshPhysicalMaterial({ color: COLORS.cable, roughness: 0.28, metalness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    metal: new MeshStandardMaterial({ color: COLORS.metal, roughness: 0.32, metalness: 0.9 }),
    screw: new MeshStandardMaterial({ color: COLORS.screw, roughness: 0.4, metalness: 0.75 }),
    // Pale porcelain skin. Its colours (lips, brows, creases) are painted on the vertices.
    skin: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.5,
      sheen: 0.35,
      sheenColor: COLORS.skinSheen,
      sheenRoughness: 0.7,
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    }),
    eye: new MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    // Unlit, so the lamp's warm light never tints the inside of the mouth.
    mouthInside: new MeshBasicMaterial({ color: COLORS.mouthInside }),
    teeth: new MeshStandardMaterial({ color: COLORS.teeth, roughness: 0.35 }),
    // The stomach core's slats glow in the predicted emotion's colour (Robot.tsx sets the colour).
    core: new MeshStandardMaterial({ color: COLORS.coreSlat, roughness: 0.35, metalness: 0.2, emissive: COLORS.gold, emissiveIntensity: 0.6, side: DoubleSide }),
  };
}

export type RobotMaterials = ReturnType<typeof createMaterials>;

const MaterialsContext = createContext<RobotMaterials | null>(null);

/** Creates the shared materials for one robot and frees them when it goes away. */
export function useCreateRobotMaterials(): RobotMaterials {
  const materials = useMemo(() => createMaterials(), []);
  useEffect(
    () => () =>
      Object.values(materials).forEach((material) => {
        if ("map" in material && material.map) material.map.dispose();
        material.dispose();
      }),
    [materials],
  );
  return materials;
}

export const RobotMaterialsProvider = MaterialsContext.Provider;

export function useRobotMaterials(): RobotMaterials {
  const materials = useContext(MaterialsContext);
  if (!materials) throw new Error("Robot parts must be inside <Robot>.");
  return materials;
}
