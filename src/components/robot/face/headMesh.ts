// Turns the sculpted head (headSdf) into one dense mesh. Rays go out in a grid of directions (closer
// together over the face) and each finds the skin. Rays for the upper face start at eye level and rays
// for the lower face start behind the mouth, so none has to pass a nose or brow to reach the skin.
// Then the mouth line is cut (so the lips can part), the lips roll inward, and colours and shape
// changes (morphs) are added. Plain arrays only.
import { headSdf } from "./headSdf";
import { FACE } from "./landmarks";
import { MORPH_NAMES, faceMorphs, type MorphName, type VertexInfo } from "./faceMorphs";
import { smoothstep } from "./sdf";
import { paintSkin } from "./skinColor";

type Floats = Float32Array<ArrayBuffer>;

export interface HeadMeshData {
  positions: Floats;
  normals: Floats;
  colors: Floats;
  indices: Uint32Array<ArrayBuffer>;
  /** Per shape change: how far each vertex moves at full strength (and how its normal changes). */
  morphs: Record<MorphName, { positions: Floats; normals: Floats }>;
}

const COLUMNS = 200; // around the head
const ROWS = 150; // bottom to top

/** Ray start points: behind the mouth for the lower face, at eye level for the upper face. */
const LOW: [number, number, number] = [0, 0.035, 0.015];
const HIGH: [number, number, number] = [0, 0.075, 0];
/** Where skinPoint's rays start (eye level, in the middle of the head). */
export const SKIN_ORIGIN = HIGH;
const originAt = (phi: number): [number, number, number] => {
  const t = smoothstep(-0.12, 0.3, phi);
  return [0, LOW[1] + (HIGH[1] - LOW[1]) * t, LOW[2] + (HIGH[2] - LOW[2]) * t];
};

/** `count` values from `from` to `to`, packed closer where `density` is high. */
function spacedSamples(count: number, from: number, to: number, density: (t: number) => number, closed: boolean): number[] {
  const steps = 4000;
  const cumulative = [0];
  for (let i = 1; i <= steps; i++) {
    const t = from + ((to - from) * (i - 0.5)) / steps;
    cumulative.push(cumulative[i - 1] + density(t));
  }
  const total = cumulative[steps];
  const out: number[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (closed ? count : count - 1);
    while (j < steps && cumulative[j + 1] < target) j++;
    const span = cumulative[j + 1] - cumulative[j] || 1;
    out.push(from + ((to - from) * (j + (target - cumulative[j]) / span)) / steps);
  }
  return out;
}

/** Distance from `origin` to the skin along a direction (the outermost surface). */
function surfaceRadius(o: [number, number, number], dx: number, dy: number, dz: number, guess: number): number {
  const f = (r: number) => headSdf(o[0] + dx * r, o[1] + dy * r, o[2] + dz * r);
  let hi = guess + 0.007;
  let fHi = f(hi);
  while (fHi < 0) {
    hi += 0.01;
    fHi = f(hi);
  }
  // March inwards with cautious steps (a fraction of the distance)...
  let lo = hi;
  let fLo = fHi;
  for (let i = 0; i < 200 && fLo > 0 && lo > 0.01; i++) {
    hi = lo;
    fHi = fLo;
    lo -= Math.max(fLo * 0.6, 0.0003);
    fLo = f(lo);
  }
  // ...then home in on the crossing (false position, with the stalled end halved so it keeps closing).
  for (let i = 0; i < 6 && hi - lo > 1e-6; i++) {
    const r = hi - (fHi * (hi - lo)) / (fHi - fLo);
    const fr = f(r);
    if (fr > 0) {
      hi = r;
      fHi = fr;
      fLo /= 2;
    } else {
      lo = r;
      fLo = fr;
      fHi /= 2;
    }
  }
  return hi - (fHi * (hi - lo)) / (fHi - fLo);
}

/** The point on the skin in the direction of (x, y, z) from eye level, lifted `lift` metres off it. */
export function skinPoint(x: number, y: number, z: number, lift = 0): [number, number, number] {
  const dx = x - HIGH[0];
  const dy = y - HIGH[1];
  const dz = z - HIGH[2];
  const length = Math.hypot(dx, dy, dz);
  const r = surfaceRadius(HIGH, dx / length, dy / length, dz / length, length) + lift;
  return [HIGH[0] + (dx / length) * r, HIGH[1] + (dy / length) * r, HIGH[2] + (dz / length) * r];
}

/** Smooth normals straight from the sculpted shape (so stretched triangles still shade cleanly). */
function sdfNormal(x: number, y: number, z: number, out: Float32Array, i: number) {
  const h = 0.0003;
  const a = headSdf(x + h, y - h, z - h);
  const b = headSdf(x - h, y - h, z + h);
  const c = headSdf(x - h, y + h, z - h);
  const d = headSdf(x + h, y + h, z + h);
  const nx = a - b - c + d;
  const ny = -a - b + c + d;
  const nz = -a + b - c + d;
  const len = Math.hypot(nx, ny, nz) || 1;
  out[i * 3] = nx / len;
  out[i * 3 + 1] = ny / len;
  out[i * 3 + 2] = nz / len;
}

/** Area-weighted vertex normals of a triangle mesh. */
export function meshNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    normals[a] += nx;
    normals[a + 1] += ny;
    normals[a + 2] += nz;
    normals[b] += nx;
    normals[b + 1] += ny;
    normals[b + 2] += nz;
    normals[c] += nx;
    normals[c + 1] += ny;
    normals[c + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
  return normals;
}

const emptyInfo = (): VertexInfo => ({ lip: 0, slit: 0, slitY: 0 });

export function buildHeadMesh(): HeadMeshData {
  // Closer rays over the face, and closest around the eyes and the mouth.
  const bump = (v: number, at: number, width: number) => Math.exp(-((v - at) ** 2) / (2 * width * width));
  const thetas = spacedSamples(COLUMNS, -Math.PI, Math.PI, (t) => 1 + 4 * bump(t, 0, 0.55), true);
  const phis = spacedSamples(ROWS, -1.5, 1.5, (p) => 1 + 3.5 * bump(p, 0, 0.6) + 2.5 * bump(p, -0.36, 0.1), false);

  // 1. Find the skin along every ray.
  const grid: Array<{ x: number; y: number; z: number; info: VertexInfo }> = [];
  const columnGuess = new Array<number>(COLUMNS).fill(0.1);
  for (let row = 0; row < ROWS; row++) {
    const phi = phis[row];
    const origin = originAt(phi);
    for (let col = 0; col < COLUMNS; col++) {
      const theta = thetas[col];
      const dx = Math.cos(phi) * Math.sin(theta);
      const dy = Math.sin(phi);
      const dz = Math.cos(phi) * Math.cos(theta);
      const r = surfaceRadius(origin, dx, dy, dz, columnGuess[col]);
      columnGuess[col] = r;
      grid.push({ x: origin[0] + dx * r, y: origin[1] + dy * r, z: origin[2] + dz * r, info: emptyInfo() });
    }
  }

  // 2. The mouth line: the row through the lips' meeting point, across the mouth's width.
  const front = thetas.reduce((best, t, i) => (Math.abs(t) < Math.abs(thetas[best]) ? i : best), 0);
  let slitRow = 0;
  for (let row = 0; row < ROWS; row++) {
    if (Math.abs(grid[row * COLUMNS + front].y - FACE.mouth.y) < Math.abs(grid[slitRow * COLUMNS + front].y - FACE.mouth.y)) slitRow = row;
  }
  const slitY = grid[slitRow * COLUMNS + front].y;
  const inSlit = (col: number) => {
    const v = grid[slitRow * COLUMNS + col];
    return v.z > 0.05 && Math.abs(v.x) < FACE.mouth.halfWidth - 0.0006;
  };

  // The lips roll inwards (towards the back of the mouth) along the mouth line, so closed lips meet in a soft crease.
  for (const v of grid) {
    const taper = smoothstep(FACE.mouth.halfWidth + 0.002, FACE.mouth.halfWidth * 0.55, Math.abs(v.x)) * (v.z > 0.05 ? 1 : 0);
    v.info.slitY = slitY;
    if (taper <= 0) continue;
    const roll = 0.0034 * Math.exp(-(((v.y - slitY) / 0.0012) ** 2)) * taper;
    v.z -= roll;
    v.info.lip = taper;
  }

  // 3. Vertex list: the grid, the duplicated lower edge of the mouth line, and the two poles.
  const vertices = grid.map((v) => ({ ...v, info: { ...v.info } }));
  const lowerCopy = new Map<number, number>();
  for (let col = 0; col < COLUMNS; col++) {
    if (!inSlit(col)) continue;
    const index = slitRow * COLUMNS + col;
    vertices[index].info.slit = 1; // upper lip edge
    lowerCopy.set(col, vertices.length);
    vertices.push({ ...grid[index], info: { ...grid[index].info, slit: -1 } }); // lower lip edge
  }
  const pole = (up: number) => {
    const o = originAt(up * 1.5);
    const r = surfaceRadius(o, 0, up, 0, 0.1);
    return { x: o[0], y: o[1] + up * r, z: o[2], info: { ...emptyInfo(), slitY } };
  };
  const bottomPole = vertices.length;
  vertices.push(pole(-1));
  const topPole = vertices.length;
  vertices.push(pole(1));

  // 4. Triangles. Faces below the mouth line use the lower edge copies, so the lips can part.
  const indices: number[] = [];
  const at = (row: number, col: number, below: boolean) => {
    const c = (col + COLUMNS) % COLUMNS;
    if (below && row === slitRow && lowerCopy.has(c)) return lowerCopy.get(c)!;
    return row * COLUMNS + c;
  };
  for (let row = 0; row < ROWS - 1; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const below = row + 1 === slitRow; // this band of faces lies just below the mouth line
      const a = at(row, col, false);
      const b = at(row, col + 1, false);
      const c = at(row + 1, col + 1, below);
      const d = at(row + 1, col, below);
      indices.push(a, b, c, a, c, d);
    }
  }
  for (let col = 0; col < COLUMNS; col++) {
    indices.push(bottomPole, at(0, col + 1, false), at(0, col, false));
    indices.push(topPole, at(ROWS - 1, col, false), at(ROWS - 1, col + 1, false));
  }

  const count = vertices.length;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  vertices.forEach((v, i) => {
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    sdfNormal(v.x, v.y, v.z, normals, i);
  });
  const index = new Uint32Array(indices);
  const infos = vertices.map((v) => v.info);

  // 5. Colour (skin, lips, brows, the dark neck opening) and shape changes.
  const colors = new Float32Array(count * 3);
  paintSkin(positions, normals, infos, colors);

  const baseMeshNormals = meshNormals(positions, index);
  const morphs = {} as HeadMeshData["morphs"];
  for (const name of MORPH_NAMES) {
    const delta = new Float32Array(count * 3);
    const moved = new Float32Array(positions);
    for (let i = 0; i < count; i++) {
      const [mx, my, mz] = faceMorphs[name](positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], infos[i]);
      delta[i * 3] = mx;
      delta[i * 3 + 1] = my;
      delta[i * 3 + 2] = mz;
      moved[i * 3] += mx;
      moved[i * 3 + 1] += my;
      moved[i * 3 + 2] += mz;
    }
    const movedNormals = meshNormals(moved, index);
    morphs[name] = { positions: delta, normals: movedNormals.map((value, i) => value - baseMeshNormals[i]) };
  }
  return { positions, normals, colors, indices: index, morphs };
}
