// Adds every motion layer together once per frame and writes the result onto the robot:
//   choreography (GSAP) + emotion pose + idle life + lip-sync → joints,
// then the eyes aim at what they should look at, and the paper follows the hand.
import { Euler, Matrix4, Quaternion, Vector3, type Camera, type Object3D } from "three";
import type { EmotionVector } from "@/lib/api/contracts";
import type { Choreographer } from "./choreography";
import type { EmotionBlend } from "./emotionPose";
import { PAPER_ON_DESK } from "./Paper";
import { applyEyes, applyPose, clonePose, type RobotPose, type RobotRig } from "./pose";
import { channelWriter, clamp } from "./poseMath";
import { GAZE_LIMITS, IDLE, PAPER_HOLD, REST_POSE } from "./robotConstants";
import type { IdleMotion } from "./useIdleMotion";
import type { LipSync } from "./useLipSync";

export interface MotionLayers {
  choreo: Choreographer;
  emotion: EmotionBlend;
  idle: IdleMotion;
  lipSync: LipSync;
}

export interface MotionInput {
  rig: RobotRig;
  paper: Object3D | null;
  camera: Camera;
  canvas: HTMLCanvasElement;
  delta: number;
  /** The emotion vector once the presenter has revealed it, otherwise null (neutral face). */
  scores: EmotionVector | null;
  reducedMotion: boolean;
}

const deskPosition = new Vector3(...PAPER_ON_DESK.position);
const deskRotation = new Quaternion().setFromEuler(new Euler(...PAPER_ON_DESK.rotation));
const pickPosition = new Vector3(...PAPER_HOLD.pickUp.position);
const pickRotation = new Quaternion().setFromEuler(new Euler(...PAPER_HOLD.pickUp.rotation));
const readPosition = new Vector3(...PAPER_HOLD.read.position);
const readRotation = new Quaternion().setFromEuler(new Euler(...PAPER_HOLD.read.rotation));
const hold = new Matrix4();
const holdPosition = new Vector3();
const holdRotation = new Quaternion();
const unitScale = new Vector3(1, 1, 1);
const held = new Matrix4();
const heldPosition = new Vector3();
const heldRotation = new Quaternion();
const heldScale = new Vector3();

/**
 * The paper lies on the desk (attach 0), sits in the hand (attach 1), or is part-way between.
 * regrip moves it from the pick-up hold (0) to the reading hold (1), as a hand shifts its grip.
 */
export function placePaper(paper: Object3D, grip: Object3D | undefined, attach: number, regrip: number): void {
  if (!grip || attach <= 0.001) {
    paper.position.copy(deskPosition);
    paper.quaternion.copy(deskRotation);
  } else {
    grip.updateWorldMatrix(true, false);
    holdPosition.lerpVectors(pickPosition, readPosition, regrip);
    holdRotation.slerpQuaternions(pickRotation, readRotation, regrip);
    hold.compose(holdPosition, holdRotation, unitScale);
    held.multiplyMatrices(grip.matrixWorld, hold).decompose(heldPosition, heldRotation, heldScale);
    paper.position.lerpVectors(deskPosition, heldPosition, attach);
    paper.quaternion.slerpQuaternions(deskRotation, heldRotation, attach);
  }
  paper.updateMatrixWorld();
}

const eyeLeft = new Vector3();
const eyeRight = new Vector3();
const headTurn = new Quaternion();
const direction = new Vector3();

/** Eye angles (relative to the head) that look at a point in the room. False if the eyes are missing. */
function gazeTowards(rig: RobotRig, point: Vector3, out: { yaw: number; pitch: number }): boolean {
  if (!rig.eyeL || !rig.eyeR || !rig.head) return false;
  rig.eyeL.getWorldPosition(eyeLeft);
  rig.eyeR.getWorldPosition(eyeRight);
  rig.head.getWorldQuaternion(headTurn).invert();
  direction.subVectors(point, eyeLeft.add(eyeRight).multiplyScalar(0.5)).applyQuaternion(headTurn);
  out.yaw = clamp(Math.atan2(direction.x, direction.z), -GAZE_LIMITS.yaw, GAZE_LIMITS.yaw);
  out.pitch = clamp(Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), -GAZE_LIMITS.down, GAZE_LIMITS.up);
  return true;
}

export class MotionMixer {
  private readonly pose = clonePose(REST_POSE);
  private readonly writeChannels = channelWriter(REST_POSE);
  private readonly aim = { yaw: 0, pitch: 0 };
  private readonly spot = new Vector3();
  private readonly head = new Vector3();
  private time = 0;

  step(layers: MotionLayers, input: MotionInput): void {
    const { pose } = this;
    const { rig } = input;
    const { cues } = layers.choreo;
    const dt = Math.min(input.delta, 0.1);
    this.time += dt;

    this.writeChannels(layers.choreo.channels, pose);
    layers.emotion.update(input.scores, dt);
    layers.emotion.apply(pose, this.time, 1 - cues.chinRest);
    layers.choreo.setTempo(layers.emotion.motion.tempo);
    rig.head?.getWorldPosition(this.head);
    layers.idle.update(pose, dt, {
      follow: cues.follow,
      reading: cues.lookPaper,
      camera: input.camera,
      canvas: input.canvas,
      head: this.head,
      reducedMotion: input.reducedMotion,
    });
    layers.lipSync.update(pose, dt, { gesture: cues.gesture, motion: layers.emotion.motion });
    this.tremble(pose, layers.emotion.motion.tremble);
    limitFace(pose);

    applyPose(rig, pose);
    if (input.paper) placePaper(input.paper, rig.armR.grip, cues.attach, cues.regrip);
    this.aimEyes(layers, input);
    applyEyes(rig, pose);
  }

  /** Fear: a small, fast shake in both hands (and in the paper they hold). */
  private tremble(pose: RobotPose, amount: number): void {
    if (amount < 0.01) return;
    const a = IDLE.tremble.amount * amount;
    const t = this.time * Math.PI * 2 * IDLE.tremble.rate;
    pose.armL.wrist[0] += a * Math.sin(t);
    pose.armL.wrist[2] += a * Math.sin(t * 1.3 + 1);
    pose.armR.wrist[0] += a * Math.sin(t * 1.1 + 2);
    pose.armR.wrist[2] += a * Math.sin(t * 0.9 + 3);
  }

  /** The eyes look at the reading spot, the viewer or the pointer, then the lids follow and blink. */
  private aimEyes({ choreo, idle }: MotionLayers, { rig, paper, camera }: MotionInput): void {
    const { gaze, lids } = this.pose;
    const { cues } = choreo;
    const blendTo = (weight: number) => {
      gaze.yaw += (this.aim.yaw - gaze.yaw) * weight;
      gaze.pitch += (this.aim.pitch - gaze.pitch) * weight;
    };
    if (paper && cues.lookPaper > 0.001 && gazeTowards(rig, paper.localToWorld(this.spot.set(cues.readU, cues.readV, 0)), this.aim)) {
      blendTo(cues.lookPaper);
    }
    if (cues.lookCamera > 0.001 && gazeTowards(rig, camera.position, this.aim)) blendTo(cues.lookCamera);
    if (idle.lookWeight > 0.001 && gazeTowards(rig, idle.lookTarget, this.aim)) blendTo(idle.lookWeight);
    gaze.yaw += idle.saccade.yaw;
    gaze.pitch += idle.saccade.pitch;

    // Real upper lids follow the eyes down; a blink closes both lids.
    lids.upper += Math.max(0, -gaze.pitch - 0.1) * IDLE.lidFollowsGaze;
    lids.upper = clamp(lids.upper + (1 - lids.upper) * idle.blink, -0.2, 1);
    lids.lower = clamp(lids.lower + (1 - lids.lower) * idle.blink, -0.1, 1);
  }
}

function limitFace(pose: RobotPose): void {
  const { mouth, brows } = pose;
  mouth.open = clamp(mouth.open, 0, 1);
  mouth.smile = clamp(mouth.smile, -1, 1);
  mouth.wide = clamp(mouth.wide, 0, 1);
  mouth.round = clamp(mouth.round, 0, 1);
  mouth.press = clamp(mouth.press, 0, 1);
  mouth.frown = clamp(mouth.frown, 0, 1);
  mouth.sneer = clamp(mouth.sneer, 0, 1);
  mouth.stretch = clamp(mouth.stretch, 0, 1);
  mouth.cheek = clamp(mouth.cheek, 0, 1);
  brows.tilt = clamp(brows.tilt, -0.4, 0.4);
  brows.raise = clamp(brows.raise, -0.004, 0.007);
}
