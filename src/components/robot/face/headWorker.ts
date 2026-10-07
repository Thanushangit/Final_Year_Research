// Builds the head's skin mesh off the main thread (it takes about a second), then hands the arrays back.
import { buildHeadMesh } from "./headMesh";

self.onmessage = () => {
  const head = buildHeadMesh();
  const buffers: ArrayBuffer[] = [head.positions.buffer, head.normals.buffer, head.colors.buffer, head.indices.buffer];
  for (const morph of Object.values(head.morphs)) buffers.push(morph.positions.buffer, morph.normals.buffer);
  self.postMessage(head, { transfer: buffers });
};
