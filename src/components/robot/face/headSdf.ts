// The android's head, sculpted in code: skull, jaw, cheekbones, brow ridge, nose and lips are simple
// shapes melted together with smooth unions (see landmarks.ts for the measurements).
import { eyeAngles, openingDistance } from "./eyeShape";
import { FACE } from "./landmarks";
import { ellipsoid, makeEllipsoid, roundCone, smin, ssub, type V3 } from "./sdf";

const E = FACE.eye;

// Each shape is made once: this function runs a few million times while the head is built.
const el = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) => makeEllipsoid([cx, cy, cz], [rx, ry, rz]);
// A broad, square head as in the reference: the skull, cheeks and jaw are wide; the chin is broad.
const CRANIUM = el(0, 0.108, -0.006, 0.082, 0.09, 0.097);
const CRANIUM_TOP = el(0, 0.135, -0.015, 0.077, 0.06, 0.085);
const EAR_LEVEL = el(0, 0.05, -0.018, 0.069, 0.042, 0.074);
const MID_FACE = el(0, 0.046, 0.04, 0.069, 0.048, 0.057);
const CHEEKBONE = el(0.045, 0.056, 0.06, 0.022, 0.014, 0.024);
// Full cheeks: the soft pad under each eye, and the side of the face filled down to the jaw (no hollows).
const CHEEK = el(0.031, 0.042, 0.07, 0.026, 0.026, 0.02);
const CHEEK_SIDE = el(0.043, 0.022, 0.044, 0.025, 0.032, 0.03);
const JAW = el(0, -0.008, 0.036, 0.057, 0.028, 0.06);
const JAW_ANGLE: [V3, V3] = [[0.061, -0.008, 0.008], [0.059, 0.03, -0.012]];
const JAW_LINE: [V3, V3] = [[0.061, -0.011, 0.01], [0.025, -0.033, 0.074]];
const CHIN = el(0, -0.03, 0.082, 0.031, 0.018, 0.02);
// A soft brow ridge (the reference has no hard shelf over the eyes).
const BROW = el(0.025, 0.0925, 0.081, 0.03, 0.008, 0.012);
const MUZZLE = el(0, 0.009, 0.066, 0.036, 0.028, 0.032);
// A long, straight, fairly narrow nose with a rounded tip and small wings.
const NOSE_BRIDGE: [V3, V3] = [[0, 0.079, 0.087], [0, 0.042, 0.107]];
const NOSE_TIP = el(0, 0.0365, 0.1105, 0.0082, 0.0082, 0.009);
const NOSE_WING = el(0.0094, 0.0292, 0.0965, 0.0044, 0.0042, 0.0062);
const NOSE_BASE = el(0, 0.0275, 0.1025, 0.006, 0.004, 0.0086);
// A thin upper lip with a clear bow; a fuller lower lip.
const UPPER_LIP = el(0, 0.0098, 0.0918, 0.016, 0.0052, 0.0098);
const UPPER_LIP_SIDE = el(0.013, 0.0082, 0.0898, 0.012, 0.0037, 0.0082);
const CUPIDS_BOW = el(0.0058, 0.0118, 0.0965, 0.0062, 0.0032, 0.0058);
const PHILTRUM: [V3, V3] = [[0.0042, 0.0225, 0.0965], [0.0052, 0.0138, 0.0995]];
const LOWER_LIP = el(0, -0.0058, 0.0905, 0.0155, 0.0078, 0.0118);
const LOWER_LIP_SIDE = el(0.012, -0.0038, 0.0885, 0.011, 0.0055, 0.0095);
const UNDER_LIP_CREASE = el(0, -0.0182, 0.1, 0.015, 0.0036, 0.0058);
const EYE_SOCKET = el(E.x, E.y + 0.004, E.z + 0.012, 0.0175, 0.0105, 0.012);
const TEMPLE = el(0.086, 0.088, 0.045, 0.006, 0.016, 0.016);

/** Signed distance from the head's skin (negative inside). */
export function headSdf(x: number, y: number, z: number): number {
  const ax = Math.abs(x); // the face is symmetric

  // Skull: the cranium (broad and fairly flat on top) plus the wider area at ear level.
  let d = ellipsoid(ax, y, z, CRANIUM);
  d = smin(d, ellipsoid(ax, y, z, CRANIUM_TOP), 0.03);
  d = smin(d, ellipsoid(ax, y, z, EAR_LEVEL), 0.03);
  // The back and top of the head: the face's shapes are too far away to change anything there.
  if (z < -0.065 || y > 0.135) return d;

  // Mid-face, cheekbones, jaw and chin.
  d = smin(d, ellipsoid(ax, y, z, MID_FACE), 0.035);
  d = smin(d, ellipsoid(ax, y, z, CHEEKBONE), 0.03);
  d = smin(d, ellipsoid(ax, y, z, CHEEK_SIDE), 0.03);
  d = smin(d, ellipsoid(ax, y, z, CHEEK), 0.022);
  d = smin(d, ellipsoid(ax, y, z, JAW), 0.032);
  d = smin(d, roundCone(ax, y, z, JAW_ANGLE[0], JAW_ANGLE[1], 0.011, 0.009), 0.024);
  d = smin(d, roundCone(ax, y, z, JAW_LINE[0], JAW_LINE[1], 0.011, 0.012), 0.013);
  d = smin(d, ellipsoid(ax, y, z, CHIN), 0.012);

  // Brow ridge, and the area around the mouth (over the teeth).
  d = smin(d, ellipsoid(ax, y, z, BROW), 0.016);
  d = smin(d, ellipsoid(ax, y, z, MUZZLE), 0.016);

  // Nose (bridge, tip, wings, the base between the nostrils) and lips only matter near the middle of the face.
  if (ax < 0.04 && z > 0.06) {
    let nose = roundCone(ax, y, z, NOSE_BRIDGE[0], NOSE_BRIDGE[1], 0.0052, 0.0078);
    nose = smin(nose, ellipsoid(ax, y, z, NOSE_TIP), 0.006);
    nose = smin(nose, ellipsoid(ax, y, z, NOSE_WING), 0.006);
    nose = smin(nose, ellipsoid(ax, y, z, NOSE_BASE), 0.004);
    d = smin(d, nose, 0.009);

    // Lips: fuller in the middle, thinning to the corners. Upper lip with a cupid's bow and philtrum ridges.
    if (y < 0.04) {
      let lips = ellipsoid(ax, y, z, UPPER_LIP);
      lips = smin(lips, ellipsoid(ax, y, z, UPPER_LIP_SIDE), 0.004);
      lips = smin(lips, ellipsoid(ax, y, z, CUPIDS_BOW), 0.003);
      lips = smin(lips, roundCone(ax, y, z, PHILTRUM[0], PHILTRUM[1], 0.0022, 0.0026), 0.004);
      lips = smin(lips, ellipsoid(ax, y, z, LOWER_LIP), 0.003);
      lips = smin(lips, ellipsoid(ax, y, z, LOWER_LIP_SIDE), 0.004);
      d = smin(d, lips, 0.006);
      d = ssub(d, ellipsoid(ax, y, z, UNDER_LIP_CREASE), 0.005); // the crease under the lower lip
    }
  }

  // The eye sockets and the temples.
  d = ssub(d, ellipsoid(ax, y, z, EYE_SOCKET), 0.012);
  d = ssub(d, ellipsoid(ax, y, z, TEMPLE), 0.02);

  // The skin wraps each eyeball. The almond-shaped opening is left clear down to just behind the
  // eyeball's surface; it is a little bigger than the eyelids' own opening, so their rings cover its edge.
  const ex = ax - E.x;
  const ey = y - E.y;
  const ez = z - E.z;
  const er = Math.sqrt(ex * ex + ey * ey + ez * ez);
  d = smin(d, er - (E.radius + 0.0008), 0.004);
  if (ez > -0.006 && er < E.radius + 0.012) {
    const { alpha, beta } = eyeAngles(ex, ey, ez);
    const outside = (openingDistance(alpha, beta) - 0.1) * er;
    const hole = Math.max(outside, E.radius - 0.002 - er, er - (E.radius + 0.006));
    d = Math.max(d, -hole);
  }
  return d;
}
