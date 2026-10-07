// A robot pose is a plain list of numbers. Animation layers add their numbers together, then
// applyPose() writes the result onto the joints and face shapes once per frame.
import type { Mesh, Object3D } from "three";
import { JAW_OPEN, MORPH_NAMES, type MorphName } from "./face/faceMorphs";
import { LID_MORPHS, type LidMorph } from "./face/eyelids";
import { BODY, JOINT, LIMITS, armJoint, type Side } from "./robotConstants";

export type Vec3 = [number, number, number];

export interface ArmPose {
  /** Swing forward (−x) or back, twist, and out to the side (+z, both arms). */
  shoulder: Vec3;
  /** Bend: negative brings the forearm forward. */
  elbow: number;
  wrist: Vec3;
  /** 0 = open hand, 1 = fist (the four fingers). */
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
  /** 0 = open, 1 = closed (the upper lid can go below 0: eyes wide open). */
  lids: { upper: number; lower: number };
  /** raise in metres; tilt > 0 lifts the inner ends (worried), < 0 pulls them down (cross). */
  brows: { raise: number; tilt: number };
  /**
   * All 0 to 1 (smile can go below 0). frown = corners down + chin up (sad), sneer = upper lip and nose
   * up (anger), stretch = lips pulled back (fear), cheek = cheeks lifted into the eyes (a real smile).
   */
  mouth: { open: number; smile: number; wide: number; round: number; press: number; frown: number; sneer: number; stretch: number; cheek: number };
  armL: ArmPose;
  armR: ArmPose;
  /** Breathing: 0 = rest, 1 = full breath in. */
  breath: number;
  /** 0 = rest, 1 = both shoulders lifted (a tense, fearful shrug). */
  shrug: number;
}

type Joint = Object3D | undefined;

interface ArmRig {
  shoulder: Joint;
  elbow: Joint;
  wrist: Joint;
  thumb: [Joint, Joint, Joint];
  fingers: Array<[Joint, Joint, Joint]>;
  /** The empty point in the hand where a held sheet of paper is fixed. */
  grip: Joint;
}

export interface RobotRig {
  spine?: Object3D;
  chest?: Object3D;
  neck?: Object3D;
  head?: Object3D;
  eyeL?: Object3D;
  eyeR?: Object3D;
  /** The skin, with one shape change per face movement (see face/faceMorphs.ts). */
  face?: Mesh;
  lidL?: Mesh;
  lidR?: Mesh;
  /** Carries the lower teeth; turns with the jaw. */
  jaw?: Object3D;
  chestPanel?: Mesh;
  armL: ArmRig;
  armR: ArmRig;
}

const FACE_INDEX = Object.fromEntries(MORPH_NAMES.map((name, i) => [name, i])) as Record<MorphName, number>;
const LID_INDEX = Object.fromEntries(LID_MORPHS.map((name, i) => [name, i])) as Record<LidMorph, number>;

function collectArm(root: Object3D, side: Side): ArmRig {
  const names = armJoint(side);
  const find = (name: string) => root.getObjectByName(name);
  return {
    shoulder: find(names.shoulder),
    elbow: find(names.elbow),
    wrist: find(names.wrist),
    thumb: [find(names.thumb(0)), find(names.thumb(1)), find(names.thumb(2))],
    fingers: [0, 1, 2, 3].map((i) => [find(names.finger(i, 0)), find(names.finger(i, 1)), find(names.finger(i, 2))]),
    grip: find(names.grip),
  };
}

/** Finds every joint by name once, after the robot has mounted. */
export function collectRig(root: Object3D): RobotRig {
  const find = (name: string) => root.getObjectByName(name);
  return {
    spine: find(JOINT.spine),
    chest: find(JOINT.chest),
    neck: find(JOINT.neck),
    head: find(JOINT.head),
    eyeL: find(JOINT.eyeL),
    eyeR: find(JOINT.eyeR),
    face: find(JOINT.face) as Mesh | undefined,
    lidL: find(JOINT.lidL) as Mesh | undefined,
    lidR: find(JOINT.lidR) as Mesh | undefined,
    jaw: find(JOINT.jaw),
    chestPanel: find(JOINT.chestPanel) as Mesh | undefined,
    armL: collectArm(root, "left"),
    armR: collectArm(root, "right"),
  };
}

const setRotation = (joint: Joint, [x, y, z]: Vec3) => joint?.rotation.set(x, y, z);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Arm poses use the same numbers for both sides; the right arm is mirrored here. */
function applyArm(arm: ArmRig, pose: ArmPose, mirror: 1 | -1, shrug: number) {
  arm.shoulder?.position.setY(BODY.shoulderY + shrug * LIMITS.shrug);
  setRotation(arm.shoulder, [pose.shoulder[0], mirror * pose.shoulder[1], mirror * pose.shoulder[2]]);
  arm.elbow?.rotation.set(pose.elbow, 0, 0);
  setRotation(arm.wrist, [pose.wrist[0], mirror * pose.wrist[1], mirror * pose.wrist[2]]);
  for (const [base, middle, tip] of arm.fingers) {
    base?.rotation.set(pose.curl * LIMITS.fingerBase, 0, 0);
    middle?.rotation.set(pose.curl * LIMITS.fingerMiddle, 0, 0);
    tip?.rotation.set(pose.curl * LIMITS.fingerTip, 0, 0);
  }
  // At rest the thumb points down and out from the palm's inner edge; curling brings it across the palm.
  const [thumbBase, thumbMiddle, thumbTip] = arm.thumb;
  thumbBase?.rotation.set(pose.thumb * 0.6, 0, -mirror * (0.55 - pose.thumb * 0.75));
  thumbMiddle?.rotation.set(pose.thumb * LIMITS.thumb * 0.6, 0, 0);
  thumbTip?.rotation.set(pose.thumb * LIMITS.thumb * 0.5, 0, 0);
}

/** Eyes and eyelids only. Called by applyPose, and again once the eyes have found what to look at. */
export function applyEyes(rig: RobotRig, pose: Pick<RobotPose, "gaze" | "lids">): void {
  for (const eye of [rig.eyeL, rig.eyeR]) eye?.rotation.set(-pose.gaze.pitch, pose.gaze.yaw, 0);
  const wide = clamp01(-pose.lids.upper / LIMITS.lidWide);
  for (const lid of [rig.lidL, rig.lidR]) {
    const influences = lid?.morphTargetInfluences;
    if (!influences) continue;
    influences[LID_INDEX.upperClose] = clamp01(pose.lids.upper);
    influences[LID_INDEX.lowerClose] = clamp01(pose.lids.lower);
    influences[LID_INDEX.upperWide] = wide;
  }
  const face = rig.face?.morphTargetInfluences;
  if (face) face[FACE_INDEX.eyesWide] = wide;
}

/** The mouth, jaw and brows are shape changes on the skin; the lower teeth turn with the jaw. */
function applyFace(rig: RobotRig, pose: RobotPose) {
  rig.jaw?.rotation.set(pose.mouth.open * JAW_OPEN, 0, 0);
  const face = rig.face?.morphTargetInfluences;
  if (!face) return;
  face[FACE_INDEX.jawOpen] = pose.mouth.open;
  face[FACE_INDEX.smile] = pose.mouth.smile;
  face[FACE_INDEX.wide] = pose.mouth.wide;
  face[FACE_INDEX.round] = pose.mouth.round;
  face[FACE_INDEX.press] = pose.mouth.press;
  face[FACE_INDEX.frown] = pose.mouth.frown;
  face[FACE_INDEX.sneer] = pose.mouth.sneer;
  face[FACE_INDEX.stretch] = pose.mouth.stretch;
  face[FACE_INDEX.cheek] = pose.mouth.cheek;
  face[FACE_INDEX.browRaise] = Math.max(0, pose.brows.raise) / LIMITS.browRaise;
  face[FACE_INDEX.browInnerUp] = Math.max(0, pose.brows.tilt) / LIMITS.browTilt;
  face[FACE_INDEX.browDown] = Math.max(0, -pose.brows.tilt) / LIMITS.browTilt + (Math.max(0, -pose.brows.raise) / LIMITS.browRaise) * 0.6;
}

export function applyPose(rig: RobotRig, pose: RobotPose): void {
  setRotation(rig.spine, pose.spine);
  // Breathing lifts the shoulders and head a little (moving, not scaling, so the head never changes size).
  rig.chest?.position.setY(pose.breath * 0.006);
  setRotation(rig.neck, pose.neck);
  setRotation(rig.head, pose.head);
  applyEyes(rig, pose);
  applyFace(rig, pose);
  applyArm(rig.armL, pose.armL, 1, pose.shrug);
  applyArm(rig.armR, pose.armR, -1, pose.shrug);
}

/** A deep copy, so a layer can change a pose without touching the original. */
export function clonePose(pose: RobotPose): RobotPose {
  return structuredClone(pose);
}
