// Where the face's features are, in head-local metres: the origin is the neck pivot, +y up, +z forward,
// +x the robot's left. Measurements follow an adult male head (about 23 cm from chin to crown).
import type { V3 } from "./sdf";

export const FACE = {
  /** Eyeball centre (the right eye is at −x) and radius. */
  eye: { x: 0.032, y: 0.0745, z: 0.073, radius: 0.0122 },
  /** Where the lips meet (the mouth line), and half the mouth's width. */
  mouth: { y: 0.0032, z: 0.099, halfWidth: 0.0245 },
  /** The jaw opens around this sideways axis (just in front of the ears). */
  jawHinge: [0, 0.036, -0.004] as V3,
  /** The black ear discs: centre and radius. */
  ear: { x: 0.068, y: 0.066, z: -0.004, radius: 0.036 },
  /** Below this height the skin ends and the black neck shows. */
  chinBottom: -0.046,
};
