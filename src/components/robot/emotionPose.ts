// How each emotion changes the robot's face and body. These offsets are added on top of every other
// motion layer. The robot blends them by the whole probability vector from IndicBERT (the same vector
// VITS receives), so a confident prediction shows clearly and an unsure one only a little.
import { EMOTIONS, type Emotion, type EmotionVector } from "@/lib/api/contracts";
import type { RobotPose } from "./pose";
import { addOffset, type PartialPose } from "./poseMath";

export const EMOTION_POSES: Record<Emotion, PartialPose> = {
  neutral: {},
  // Brows up, lip corners up, head slightly up, a happy squint.
  happiness: { brows: { raise: 0.003, tilt: 0.02 }, mouth: { smile: 0.45 }, lids: { lower: 0.12 }, head: [-0.05, 0, 0.03] },
  // Inner brows up, heavy lids, head down, mouth corners down.
  sadness: {
    brows: { raise: 0.001, tilt: 0.28 },
    lids: { upper: 0.22 },
    mouth: { smile: -0.7 },
    head: [0.12, 0, -0.03],
    neck: [0.04, 0, 0],
    spine: [0.04, 0, 0],
    shrug: -0.2,
  },
  // Brows down and in, narrowed eyes, pressed lips.
  anger: { brows: { raise: -0.003, tilt: -0.32 }, lids: { upper: 0.18, lower: 0.15 }, mouth: { smile: -0.45, press: 0.35 }, head: [0.05, 0, 0] },
  // Brows up and together, eyes wide open, shoulders raised.
  fear: { brows: { raise: 0.005, tilt: 0.3 }, lids: { upper: -0.14 }, mouth: { smile: -0.3, wide: 0.15 }, shrug: 1, head: [0.03, 0, 0], spine: [-0.02, 0, 0] },
};

export interface EmotionMotion {
  /** Speed of the choreography (sadness is slower). */
  tempo: number;
  /** Size of the speaking gestures and nods. */
  gesture: number;
  /** Stiffness of the gesture springs: higher is sharper (anger). */
  sharpness: number;
  /** Lower damping is bouncier (happiness). */
  bounce: number;
  /** Hand trembling (fear). */
  tremble: number;
}

export const EMOTION_MOTION: Record<Emotion, EmotionMotion> = {
  neutral: { tempo: 1, gesture: 1, sharpness: 1, bounce: 1, tremble: 0 },
  happiness: { tempo: 1.1, gesture: 1.3, sharpness: 1, bounce: 1.6, tremble: 0 },
  sadness: { tempo: 0.8, gesture: 0.6, sharpness: 0.6, bounce: 0.8, tremble: 0 },
  anger: { tempo: 1.05, gesture: 1.4, sharpness: 1.7, bounce: 0.9, tremble: 0 },
  fear: { tempo: 1, gesture: 0.8, sharpness: 1.2, bounce: 1, tremble: 1 },
};

/** Seconds to blend from one emotion to the next. */
const BLEND_TIME = 0.6;

const MOTION_KEYS = Object.keys(EMOTION_MOTION.neutral) as Array<keyof EmotionMotion>;

const noWeights = (): Record<Emotion, number> => ({ neutral: 0, happiness: 0, sadness: 0, anger: 0, fear: 0 });
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Blends the emotion offsets over 600 ms whenever the predicted vector changes (or goes away). */
export class EmotionBlend {
  private target: EmotionVector | null = null;
  private from = noWeights();
  private weights = noWeights();
  private progress = 1;
  readonly motion: EmotionMotion = { ...EMOTION_MOTION.neutral };

  update(scores: EmotionVector | null, dt: number): void {
    if (scores !== this.target) {
      this.target = scores;
      this.from = { ...this.weights };
      this.progress = 0;
    }
    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + dt / BLEND_TIME);
      const s = smoothstep(this.progress);
      for (const emotion of EMOTIONS) {
        const to = this.target?.[emotion] ?? 0;
        this.weights[emotion] = this.from[emotion] + (to - this.from[emotion]) * s;
      }
    }
    // Motion settings: each emotion's share, and neutral for whatever is left (all of it before a prediction).
    let rest = 1;
    for (const key of MOTION_KEYS) this.motion[key] = 0;
    for (const emotion of EMOTIONS) {
      const w = this.weights[emotion];
      rest -= w;
      for (const key of MOTION_KEYS) this.motion[key] += EMOTION_MOTION[emotion][key] * w;
    }
    for (const key of MOTION_KEYS) this.motion[key] += EMOTION_MOTION.neutral[key] * Math.max(0, rest);
  }

  apply(pose: RobotPose): void {
    for (const emotion of EMOTIONS) addOffset(pose, EMOTION_POSES[emotion], this.weights[emotion]);
  }
}
