// How each emotion changes the robot's face and body. These offsets are added on top of every other
// motion layer. The robot blends them by the whole probability vector from IndicBERT (the same vector
// VITS receives), so a confident prediction shows clearly and an unsure one only a little.
import { EMOTIONS, type Emotion, type EmotionVector } from "@/lib/api/contracts";
import type { RobotPose } from "./pose";
import { addOffset, type PartialPose } from "./poseMath";

// Each face follows the muscle groups a real face uses for that emotion (the Facial Action Coding System).
export const EMOTION_POSES: Record<Emotion, PartialPose> = {
  neutral: {},
  // A real smile: lip corners up, cheeks lifted into the eyes (a squint), lips just parted, head up.
  happiness: {
    brows: { raise: 0.0015, tilt: 0 },
    mouth: { smile: 0.6, cheek: 0.7, open: 0.08 },
    lids: { upper: 0.02, lower: 0.2 },
    head: [-0.04, 0, 0.04],
  },
  // Inner brows up, heavy lids, lip corners down with the chin pushed up, head and shoulders low.
  sadness: {
    brows: { raise: 0.0005, tilt: 0.3 },
    lids: { upper: 0.25 },
    mouth: { frown: 0.75, smile: -0.15, press: 0.15 },
    head: [0.12, 0, -0.03],
    neck: [0.04, 0, 0],
    spine: [0.04, 0, 0],
    shrug: -0.2,
  },
  // Brows down and together, narrowed eyes, upper lip and nose lifted, lips pressed hard, chin down.
  anger: {
    brows: { raise: -0.003, tilt: -0.32 },
    lids: { upper: 0.12, lower: 0.18 },
    mouth: { sneer: 0.45, press: 0.4, smile: -0.2, frown: 0.2 },
    head: [0.06, 0, 0],
  },
  // Brows up and together, eyes wide, lips stretched back, mouth a little open, shoulders raised.
  fear: {
    brows: { raise: 0.005, tilt: 0.3 },
    lids: { upper: -0.16 },
    mouth: { stretch: 0.6, open: 0.12, smile: -0.1 },
    shrug: 1,
    head: [0.03, 0, 0],
    spine: [-0.02, 0, 0],
  },
};

/** The face's share of each emotion pose; the rest (head, neck, spine, shoulders) is the body's. */
const FACE_PARTS = new Set(["brows", "lids", "mouth", "gaze"]);
const split = (pose: PartialPose, face: boolean): PartialPose =>
  Object.fromEntries(Object.entries(pose).filter(([part]) => FACE_PARTS.has(part) === face)) as PartialPose;
const FACE_POSES = Object.fromEntries(EMOTIONS.map((e) => [e, split(EMOTION_POSES[e], true)])) as Record<Emotion, PartialPose>;
const BODY_POSES = Object.fromEntries(EMOTIONS.map((e) => [e, split(EMOTION_POSES[e], false)])) as Record<Emotion, PartialPose>;

/**
 * A held expression never stays perfectly still: small, slow, uneven movements keep it alive.
 * `wave` is a smooth value from −1 to 1 made of two sines, so the rhythm never repeats exactly.
 */
function expressionLife(pose: RobotPose, weights: Record<Emotion, number>, time: number): void {
  const wave = (rate: number, phase: number) => 0.6 * Math.sin(time * rate + phase) + 0.4 * Math.sin(time * rate * 2.3 + phase * 1.7);
  const pulse = (rate: number, phase: number) => Math.max(0, wave(rate, phase)) ** 2;
  const { mouth, brows, lids } = pose;
  const h = weights.happiness;
  mouth.smile += h * 0.08 * wave(0.9, 0);
  mouth.cheek += h * 0.12 * wave(0.9, 0.3);
  const s = weights.sadness;
  brows.tilt += s * 0.05 * wave(0.5, 1);
  mouth.frown += s * 0.1 * pulse(1.3, 2); // the chin quivers now and then
  lids.upper += s * 0.05 * wave(0.4, 3);
  const a = weights.anger;
  mouth.sneer += a * 0.25 * pulse(0.8, 4); // the nose wrinkles in short bursts
  mouth.press += a * 0.12 * wave(1.1, 5);
  brows.tilt -= a * 0.04 * wave(0.6, 6);
  const f = weights.fear;
  mouth.stretch += f * 0.15 * pulse(1.6, 7);
  brows.raise += f * 0.0007 * wave(1.2, 8);
  pose.gaze.yaw += f * 0.03 * wave(2.6, 9); // the eyes dart about
}

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

  /**
   * Adds the emotion on top of the pose. `bodyWeight` scales the head, neck and body part (the thinking
   * pose rests the chin on a hand, so the head must not move away from it); the face always shows fully.
   */
  apply(pose: RobotPose, time: number, bodyWeight = 1): void {
    for (const emotion of EMOTIONS) {
      addOffset(pose, FACE_POSES[emotion], this.weights[emotion]);
      addOffset(pose, BODY_POSES[emotion], this.weights[emotion] * bodyWeight);
    }
    expressionLife(pose, this.weights, time);
  }
}
