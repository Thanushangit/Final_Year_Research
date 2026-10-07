// Colours painted onto the skin's vertices: pale porcelain skin, darker creases (worked out from the
// sculpted shape), brows, lips, nostrils, and the black neck mechanics showing under the jaw.
// Colours are picked from the reference image (sRGB) and stored linear, as three.js expects.
import type { VertexInfo } from "./faceMorphs";
import { headSdf } from "./headSdf";
import { FACE } from "./landmarks";
import { gauss, smoothstep } from "./sdf";

type Rgb = [number, number, number];

const SKIN: Rgb = [232, 224, 220];
const SOCKET: Rgb = [206, 192, 186];
const WARM: Rgb = [228, 206, 200];
const LIP_UPPER: Rgb = [192, 156, 146];
const LIP_LOWER: Rgb = [208, 174, 164];
const LIP_LINE: Rgb = [92, 60, 54];
const BROW: Rgb = [112, 96, 86];
const NOSTRIL: Rgb = [70, 50, 46];
const NECK: Rgb = [36, 34, 33];

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function mix(into: Rgb, colour: Rgb, amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  for (let i = 0; i < 3; i++) into[i] += (colour[i] - into[i]) * t;
}

/** How hidden a point is (0 open, 1 deep in a crease), from the sculpted shape around it. */
function occlusion(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
  let sum = 0;
  let weight = 1;
  for (const step of [0.003, 0.006, 0.01]) {
    sum += weight * Math.max(0, step - headSdf(x + nx * step, y + ny * step, z + nz * step));
    weight *= 0.5;
  }
  return Math.min(1, sum * 80);
}

/** Lip outline: the upper lip's top edge has a cupid's bow; both taper to the corners. */
function lipAmount(x: number, y: number, z: number, slitY: number): { upper: number; lower: number } {
  const hw = FACE.mouth.halfWidth;
  const ax = Math.abs(x);
  const across = Math.max(0, 1 - (ax / (hw * 1.04)) ** 2);
  const bow = 0.0078 - 0.0013 * gauss(x * x, 0.0024) + 0.0009 * gauss((ax - 0.0065) ** 2, 0.003);
  const top = slitY + bow * across ** 0.55;
  const bottom = slitY - 0.0098 * across ** 0.5;
  const front = smoothstep(0.078, 0.088, z);
  const soft = 0.0007;
  return {
    upper: smoothstep(slitY - soft, slitY, y) * smoothstep(top + soft, top - soft, y) * front * (across > 0 ? 1 : 0),
    lower: smoothstep(slitY + soft, slitY, y) * smoothstep(bottom - soft, bottom + soft, y) * front * (across > 0 ? 1 : 0),
  };
}

/** The brows: thicker at the inner end, thinning to the tail. */
function browAmount(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  const along = (ax - 0.009) / 0.051; // 0 at the inner end, 1 at the tail
  if (along < -0.1 || along > 1.1) return 0;
  const line = 0.0935 + 0.0035 * Math.max(0, 1 - ((ax - 0.034) / 0.03) ** 2) - 0.0015 * along;
  const half = 0.0042 - 0.0018 * along;
  return smoothstep(half + 0.0012, half - 0.0006, Math.abs(y - line)) * smoothstep(-0.1, 0.08, along) * smoothstep(1.1, 0.85, along) * smoothstep(0.06, 0.078, z);
}

export function paintSkin(positions: Float32Array, normals: Float32Array, infos: VertexInfo[], colors: Float32Array): void {
  const E = FACE.eye;
  for (let i = 0; i < infos.length; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const info = infos[i];
    const c: Rgb = [...SKIN];
    const ax = Math.abs(x);

    // Warmth on the nose tip and cheeks, a soft shadow in the eye sockets.
    mix(c, WARM, 0.45 * gauss(x * x + (y - 0.036) ** 2 + (z - 0.115) ** 2, 0.008) + 0.25 * gauss((ax - 0.04) ** 2 + (y - 0.045) ** 2 + (z - 0.08) ** 2, 0.012));
    mix(c, SOCKET, 0.55 * gauss((ax - E.x) ** 2 + (y - 0.084) ** 2 + (z - 0.087) ** 2, 0.0065));

    const lips = lipAmount(x, y, z, info.slitY);
    mix(c, LIP_UPPER, lips.upper * 0.9);
    mix(c, LIP_LOWER, lips.lower * 0.85);
    mix(c, LIP_LINE, info.lip * Math.exp(-(((y - info.slitY) / 0.0009) ** 2)));
    mix(c, BROW, browAmount(x, y, z) * 0.78);
    // Nostrils only show from below.
    mix(c, NOSTRIL, 0.9 * smoothstep(-0.35, -0.6, ny) * gauss((ax - 0.0072) ** 2 + (y - 0.026) ** 2 + (z - 0.1035) ** 2, 0.0017));

    // Creases darken (multiplied, so painted areas darken too).
    const shade = 1 - 0.32 * occlusion(x, y, z, nx, ny, nz);
    for (let k = 0; k < 3; k++) c[k] *= shade;

    // The skin ends at the jawline; underneath and behind, the black neck mechanics show.
    const jawline = -0.012 - 0.026 * Math.min(1, Math.max(0, z / 0.09));
    const underJaw = smoothstep(-0.35, -0.5, ny) * smoothstep(jawline + 0.006, jawline + 0.002, y);
    const skullBase = smoothstep(0.012, -0.004, y) * smoothstep(-0.01, -0.03, z);
    mix(c, NECK, Math.max(underJaw, skullBase, y < FACE.chinBottom ? 1 : 0));

    colors[i * 3] = toLinear(c[0]);
    colors[i * 3 + 1] = toLinear(c[1]);
    colors[i * 3 + 2] = toLinear(c[2]);
  }
}
