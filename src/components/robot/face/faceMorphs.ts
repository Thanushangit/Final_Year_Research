// The face's shape changes ("morph targets"): how far each point of the skin moves at full strength.
// The jaw turns around its hinge; the lip corners, lips, brows and upper lids move in smooth patches.
import { FACE } from "./landmarks";
import { gauss, smoothstep } from "./sdf";

/** What the mesh builder knows about each vertex. */
export interface VertexInfo {
  /** 0 to 1: how much this vertex is part of the lips' inward roll. */
  lip: number;
  /** 1 = upper lip edge, −1 = lower lip edge (the two sides of the mouth line), 0 elsewhere. */
  slit: number;
  /** Height of the mouth line. */
  slitY: number;
}

export const MORPH_NAMES = [
  "jawOpen",
  "smile",
  "wide",
  "round",
  "press",
  "frown",
  "sneer",
  "stretch",
  "cheek",
  "browRaise",
  "browInnerUp",
  "browDown",
  "eyesWide",
] as const;
export type MorphName = (typeof MORPH_NAMES)[number];
type Move = [number, number, number];
type Morph = (x: number, y: number, z: number, info: VertexInfo) => Move;

/** Radians the jaw turns at jawOpen = 1 (the lower lip drops about 1.5 cm). */
export const JAW_OPEN = 0.15;

const NONE: Move = [0, 0, 0];
const [, HY, HZ] = FACE.jawHinge;
const M = FACE.mouth;
const EYE = FACE.eye;

/** 1 for the chin, lower lip and jaw; 0 above the mouth; a wide soft band over the cheeks. */
function jawWeight(x: number, y: number, z: number, info: VertexInfo): number {
  if (info.slit === -1) return 1;
  if (info.slit === 1) return 0;
  const lateral = smoothstep(0.018, 0.045, Math.abs(x));
  const above = 0.0004 + 0.016 * lateral;
  const below = 0.0006 + 0.012 * lateral;
  return smoothstep(above, -below, y - info.slitY) * smoothstep(-0.035, 0, z);
}

/** Closeness to the nearer mouth corner, and which side it is on. */
function corner(x: number, y: number, z: number): { g: number; side: number } {
  const side = x >= 0 ? 1 : -1;
  const d2 = (x - side * M.halfWidth) ** 2 + (y - M.y) ** 2 + (z - 0.087) ** 2;
  return { g: gauss(d2, 0.0075), side };
}

/** The lips and the skin right around them. */
function lipArea(x: number, y: number, z: number): number {
  return Math.exp(-((x / 0.027) ** 2) - ((y - M.y) / 0.013) ** 2) * smoothstep(0.07, 0.085, z);
}

const isUpper = (y: number, info: VertexInfo) => (info.slit === 0 ? y > info.slitY : info.slit === 1);

/** The eyebrow line: arched, highest a little outside the middle of the eye. */
function browBand(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  const line = 0.0935 + 0.0035 * Math.max(0, 1 - ((ax - 0.034) / 0.03) ** 2);
  return Math.exp(-(((y - line) / 0.0085) ** 2)) * smoothstep(0.004, 0.012, ax) * smoothstep(0.068, 0.05, ax) * smoothstep(0.05, 0.075, z);
}

const innerBrow = (x: number, y: number, z: number) => gauss((Math.abs(x) - 0.016) ** 2 + (y - 0.093) ** 2 + (z - 0.094) ** 2, 0.0105);

export const faceMorphs: Record<MorphName, Morph> = {
  jawOpen: (x, y, z, info) => {
    const w = jawWeight(x, y, z, info);
    if (w === 0) return NONE;
    const ry = y - HY;
    const rz = z - HZ;
    const c = Math.cos(JAW_OPEN);
    const s = Math.sin(JAW_OPEN);
    return [0, (ry * c - rz * s - ry) * w, (ry * s + rz * c - rz) * w];
  },
  // Corners up, out and back; the cheeks lift; the lower lids rise a little.
  smile: (x, y, z) => {
    const { g, side } = corner(x, y, z);
    const cheek = gauss((Math.abs(x) - 0.035) ** 2 + (y - 0.03) ** 2 + (z - 0.08) ** 2, 0.013);
    const lowerLid = gauss((Math.abs(x) - EYE.x) ** 2 + (y - 0.063) ** 2 + (z - 0.085) ** 2, 0.006);
    return [side * 0.0032 * g, 0.0042 * g + 0.0015 * cheek + 0.0006 * lowerLid, -0.002 * g + 0.0008 * cheek];
  },
  // Corners pulled out; the lips thin.
  wide: (x, y, z, info) => {
    const { g, side } = corner(x, y, z);
    const lips = lipArea(x, y, z) * (1 - g);
    const toward = isUpper(y, info) ? -1 : 1;
    return [side * 0.0055 * g, 0.0004 * g + toward * 0.0008 * lips, -0.0018 * g - 0.0008 * lips];
  },
  // Corners in, lips pushed forward, the opening rounder.
  round: (x, y, z, info) => {
    const { g, side } = corner(x, y, z);
    const lips = lipArea(x, y, z);
    const away = isUpper(y, info) ? 1 : -1;
    return [-side * 0.0075 * g, away * 0.0008 * lips, 0.0025 * g + 0.0045 * lips];
  },
  // Lips pressed together and slightly in.
  press: (x, y, z, info) => {
    const lips = lipArea(x, y, z);
    const toward = isUpper(y, info) ? -1 : 1;
    return [0, toward * 0.0012 * lips, -0.0012 * lips];
  },
  // Sadness: the lip corners pulled down, and the chin muscle pushing the lower lip and chin up.
  frown: (x, y, z, info) => {
    const { g, side } = corner(x, y, z);
    const below = gauss((Math.abs(x) - 0.026) ** 2 + (y + 0.008) ** 2 + (z - 0.085) ** 2, 0.008);
    const lowerLip = isUpper(y, info) ? 0 : lipArea(x, y, z);
    const chin = gauss(x * x + (y + 0.027) ** 2 + (z - 0.098) ** 2, 0.011);
    return [side * 0.001 * g, -0.0036 * g - 0.0012 * below + 0.0003 * lowerLip + 0.0014 * chin, -0.0006 * g + 0.0012 * lowerLip + 0.0009 * chin];
  },
  // Anger and disgust: the upper lip lifts beside the middle, the nose wings rise and flare.
  sneer: (x, y, z, info) => {
    const ax = Math.abs(x);
    const side = x >= 0 ? 1 : -1;
    const lip = isUpper(y, info) ? gauss((ax - 0.011) ** 2 + (y - 0.011) ** 2 + (z - 0.095) ** 2, 0.007) : 0;
    const wing = gauss((ax - 0.011) ** 2 + (y - 0.03) ** 2 + (z - 0.098) ** 2, 0.006);
    const fold = gauss((ax - 0.021) ** 2 + (y - 0.034) ** 2 + (z - 0.09) ** 2, 0.008);
    return [side * 0.0011 * wing, 0.0036 * lip + 0.0026 * wing + 0.0018 * fold, 0.0006 * lip + 0.0014 * fold];
  },
  // Fear: the lips pulled straight back and a little down, so they thin and tighten.
  stretch: (x, y, z, info) => {
    const { g, side } = corner(x, y, z);
    const lips = lipArea(x, y, z) * (1 - g);
    const toward = isUpper(y, info) ? -1 : 1;
    const neck = smoothstep(-0.02, -0.04, y) * gauss((Math.abs(x) - 0.03) ** 2 + (z - 0.06) ** 2, 0.014);
    return [side * 0.0042 * g, -0.0016 * g + toward * 0.0007 * lips - 0.0006 * neck, -0.0024 * g - 0.0006 * lips];
  },
  // A real smile reaches the eyes: the cheeks lift and push the skin under the eyes up (a squint).
  cheek: (x, y, z) => {
    const ax = Math.abs(x);
    const pad = gauss((ax - 0.033) ** 2 + (y - 0.047) ** 2 + (z - 0.083) ** 2, 0.012);
    const underEye = gauss((ax - EYE.x) ** 2 + (y - 0.062) ** 2 + (z - 0.085) ** 2, 0.006);
    const outer = gauss((ax - 0.05) ** 2 + (y - 0.07) ** 2 + (z - 0.07) ** 2, 0.006);
    return [0, 0.004 * pad + 0.0018 * underEye + 0.0008 * outer, 0.0022 * pad + 0.0005 * underEye];
  },
  browRaise: (x, y, z) => {
    const band = browBand(x, y, z);
    const forehead = Math.exp(-(((y - 0.115) / 0.016) ** 2)) * smoothstep(0.07, 0.085, z) * smoothstep(0.065, 0.03, Math.abs(x));
    return [0, 0.0055 * band + 0.002 * forehead, -0.0006 * band];
  },
  // Inner ends up and together (worried, sad, afraid).
  browInnerUp: (x, y, z) => {
    const inner = innerBrow(x, y, z) * smoothstep(0.05, 0.075, z);
    const outer = gauss((Math.abs(x) - 0.048) ** 2 + (y - 0.09) ** 2 + (z - 0.075) ** 2, 0.01);
    const side = x >= 0 ? 1 : -1;
    return [-side * 0.0012 * inner, 0.0042 * inner - 0.001 * outer, 0];
  },
  // Brows lowered, inner ends down and together (angry); the upper lids are pushed down a little.
  browDown: (x, y, z) => {
    const band = browBand(x, y, z);
    const inner = innerBrow(x, y, z) * smoothstep(0.05, 0.075, z);
    const lid = gauss((Math.abs(x) - EYE.x) ** 2 + (y - 0.083) ** 2 + (z - 0.085) ** 2, 0.006);
    const side = x >= 0 ? 1 : -1;
    return [-side * 0.0022 * inner, -0.003 * band - 0.0018 * inner - 0.0008 * lid, 0.0006 * band + 0.0008 * inner];
  },
  // The skin above the eyes lifts with the upper lids (fear, surprise); the lids themselves move in eyelids.ts.
  eyesWide: (x, y, z) => {
    const lid = gauss((Math.abs(x) - EYE.x) ** 2 + (y - 0.088) ** 2 + (z - 0.085) ** 2, 0.007);
    return [0, 0.0016 * lid, -0.0004 * lid];
  },
};
