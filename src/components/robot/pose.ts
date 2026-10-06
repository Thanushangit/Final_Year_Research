// A robot pose is a plain list of numbers. Animation layers (Phase 6) add their numbers together,
// then applyPose() writes the result onto the joints once per frame.
import type { Mesh, Object3D } from "three";
import { BODY, JOINT, LIMITS, armJoint, type Side } from "./robotConstants";

export type Vec3 = [number, number, number];

export interface ArmPose {
  /** Swing forward (−x) or back, twist, and out to the side (+z, both arms). */
  shoulder: Vec3;
  /** Bend: negative brings the forearm forward. */
  elbow: number;
  wrist: Vec3;
  /** 0 = open hand, 1 = fist (the three fingers). */
  curl: number;
  /** 0 = open, 1 = thumb across the palm. */
  thumb: number;
}

export interface RobotPose {
  /** Lean forward (+x), turn (y), tip sideways (z). */
  spine: Vec3;
  neck: Vec3;
  head: Vec3;
  /** Where the eyes look: + yaw = towards the robot's left, + pitch = up. */
  gaze: { yaw: number; pitch: number };
  /** 0 = open, 1 = closed. */
  lids: { upper: number; lower: number };
  /** raise in metres; tilt > 0 lifts the inner ends (worried), < 0 pulls them down (cross). */
  brows: { raise: number; tilt: number };
  /** All 0 to 1 (smile can go below 0 for a frown). */
  mouth: { open: number; smile: number; wide: number; round: number; press: number };
  armL: ArmPose;
  armR: ArmPose;
  /** Breathing: 0 = rest, 1 = full breath in. */
  breath: number;
  /** 0 = rest, 1 = both shoulders lifted (a tense, fearful shrug). */
  shrug: number;
}

interface ArmRig {
  shoulder: Object3D | undefined;
  elbow: Object3D | undefined;
  wrist: Object3D | undefined;
  thumbBase: Object3D | undefined;
  thumbTip: Object3D | undefined;
  fingers: Array<[Object3D | undefined, Object3D | undefined]>;
  /** The empty point in the hand where a held sheet of paper is fixed. */
  grip: Object3D | undefined;
}

export interface RobotRig {
  spine?: Object3D;
  chest?: Object3D;
  neck?: Object3D;
  head?: Object3D;
  eyeL?: Object3D;
  eyeR?: Object3D;
  upperLidL?: Object3D;
  lowerLidL?: Object3D;
  upperLidR?: Object3D;
  lowerLidR?: Object3D;
  browL?: Object3D;
  browR?: Object3D;
  jaw?: Object3D;
  upperLip?: Mesh;
  lowerLip?: Mesh;
  mouthInside?: Object3D;
  chestPanel?: Mesh;
  armL: ArmRig;
  armR: ArmRig;
}

function collectArm(root: Object3D, side: Side): ArmRig {
  const names = armJoint(side);
  const find = (name: string) => root.getObjectByName(name);
  return {
    shoulder: find(names.shoulder),
    elbow: find(names.elbow),
    wrist: find(names.wrist),
    thumbBase: find(names.thumbBase),
    thumbTip: find(names.thumbTip),
    fingers: [0, 1, 2].map((i) => [find(names.fingerBase(i)), find(names.fingerTip(i))]),
    grip: find(names.grip),
  };
}

/** Finds every joint by name once, after the robot has mounted. */
export function collectRig(root: Object3D): RobotRig {
  const find = (name: string) => root.getObjectByName(name);
  const upperLip = find(JOINT.upperLip) as Mesh | undefined;
  const lowerLip = find(JOINT.lowerLip) as Mesh | undefined;
  // A mesh only sets up its morph slots when it is created, and R3F adds the geometry afterwards.
  upperLip?.updateMorphTargets();
  lowerLip?.updateMorphTargets();
  return {
    spine: find(JOINT.spine),
    chest: find(JOINT.chest),
    neck: find(JOINT.neck),
    head: find(JOINT.head),
    eyeL: find(JOINT.eyeL),
    eyeR: find(JOINT.eyeR),
    upperLidL: find(JOINT.upperLidL),
    lowerLidL: find(JOINT.lowerLidL),
    upperLidR: find(JOINT.upperLidR),
    lowerLidR: find(JOINT.lowerLidR),
    browL: find(JOINT.browL),
    browR: find(JOINT.browR),
    jaw: find(JOINT.jaw),
    upperLip,
    lowerLip,
    mouthInside: find(JOINT.mouthInside),
    chestPanel: find(JOINT.chestPanel) as Mesh | undefined,
    armL: collectArm(root, "left"),
    armR: collectArm(root, "right"),
  };
}

const setRotation = (joint: Object3D | undefined, [x, y, z]: Vec3) => joint?.rotation.set(x, y, z);

/** Arm poses use the same numbers for both sides; the right arm is mirrored here. */
function applyArm(arm: ArmRig, pose: ArmPose, mirror: 1 | -1, shrug: number) {
  arm.shoulder?.position.setY(BODY.shoulderY + shrug * LIMITS.shrug);
  setRotation(arm.shoulder, [pose.shoulder[0], mirror * pose.shoulder[1], mirror * pose.shoulder[2]]);
  arm.elbow?.rotation.set(pose.elbow, 0, 0);
  setRotation(arm.wrist, [pose.wrist[0], mirror * pose.wrist[1], mirror * pose.wrist[2]]);
  for (const [base, tip] of arm.fingers) {
    base?.rotation.set(pose.curl * LIMITS.fingerBase, 0, 0);
    tip?.rotation.set(pose.curl * LIMITS.fingerTip, 0, 0);
  }
  // At rest the thumb points down and out from the palm's inner edge; curling brings it across the palm.
  arm.thumbBase?.rotation.set(pose.thumb * 0.6, 0, -mirror * (0.6 - pose.thumb * 0.8));
  arm.thumbTip?.rotation.set(pose.thumb * LIMITS.thumb, 0, 0);
}

function setLipShape(lip: Mesh | undefined, mouth: RobotPose["mouth"]) {
  const influences = lip?.morphTargetInfluences;
  if (!influences) return;
  // Same order as the morph targets in lipGeometry.ts.
  influences[0] = mouth.smile;
  influences[1] = mouth.wide;
  influences[2] = mouth.round;
  influences[3] = mouth.press;
}

/** Eyes and eyelids only. Called by applyPose, and again once the eyes have found what to look at. */
export function applyEyes(rig: RobotRig, pose: Pick<RobotPose, "gaze" | "lids">): void {
  for (const eye of [rig.eyeL, rig.eyeR]) eye?.rotation.set(-pose.gaze.pitch, pose.gaze.yaw, 0);
  const upper = -LIMITS.upperLidOpen * (1 - pose.lids.upper);
  const lower = LIMITS.lowerLidOpen * (1 - pose.lids.lower);
  rig.upperLidL?.rotation.set(upper, 0, 0);
  rig.upperLidR?.rotation.set(upper, 0, 0);
  rig.lowerLidL?.rotation.set(lower, 0, 0);
  rig.lowerLidR?.rotation.set(lower, 0, 0);
}

export function applyPose(rig: RobotRig, pose: RobotPose): void {
  setRotation(rig.spine, pose.spine);
  // Breathing lifts the shoulders and head a little (moving, not scaling, so the head never changes size).
  rig.chest?.position.setY(pose.breath * 0.006);
  setRotation(rig.neck, pose.neck);
  setRotation(rig.head, pose.head);
  applyEyes(rig, pose);

  // The left brow is at +x, so lifting its inner end is a turn the other way to the right brow's.
  rig.browL?.position.setY(BODY.brow.y + pose.brows.raise);
  rig.browR?.position.setY(BODY.brow.y + pose.brows.raise);
  rig.browL?.rotation.set(0, 0, -pose.brows.tilt);
  rig.browR?.rotation.set(0, 0, pose.brows.tilt);

  rig.jaw?.rotation.set(pose.mouth.open * LIMITS.jawOpen, 0, 0);
  rig.upperLip?.position.setY(BODY.mouth.y + pose.mouth.open * 0.004);
  // The dark inside of the mouth shows between the lips as the jaw drops.
  rig.mouthInside?.position.setY(BODY.mouth.y - 0.002 - pose.mouth.open * 0.008);
  rig.mouthInside?.scale.set(1 + pose.mouth.wide * 0.25 - pose.mouth.round * 0.35, 0.08 + pose.mouth.open * 0.34, 1);
  setLipShape(rig.upperLip, pose.mouth);
  setLipShape(rig.lowerLip, pose.mouth);

  applyArm(rig.armL, pose.armL, 1, pose.shrug);
  applyArm(rig.armR, pose.armR, -1, pose.shrug);
}

/** A deep copy, so a layer can change a pose without touching the original. */
export function clonePose(pose: RobotPose): RobotPose {
  return structuredClone(pose);
}
