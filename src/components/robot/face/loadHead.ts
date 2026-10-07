// Loads the head's skin mesh once per page: built in a background worker so the page never freezes,
// or right here if workers are not available.
import { BufferAttribute, BufferGeometry } from "three";
import { MORPH_NAMES } from "./faceMorphs";
import { buildHeadMesh, type HeadMeshData } from "./headMesh";

let pending: Promise<HeadMeshData> | null = null;

function buildInWorker(): Promise<HeadMeshData> {
  return new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      resolve(buildHeadMesh());
      return;
    }
    const worker = new Worker(new URL("./headWorker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<HeadMeshData>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = () => {
      worker.terminate();
      resolve(buildHeadMesh());
    };
    worker.postMessage(null);
  });
}

export function loadHeadMesh(): Promise<HeadMeshData> {
  pending ??= buildInWorker();
  return pending;
}

/** The skin as a three.js geometry, with one named shape change (morph target) per face movement. */
export function headGeometry(data: HeadMeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(data.normals, 3));
  geometry.setAttribute("color", new BufferAttribute(data.colors, 3));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = MORPH_NAMES.map((name) => {
    const attribute = new BufferAttribute(data.morphs[name].positions, 3);
    attribute.name = name;
    return attribute;
  });
  geometry.morphAttributes.normal = MORPH_NAMES.map((name) => new BufferAttribute(data.morphs[name].normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
