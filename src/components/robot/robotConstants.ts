// Every size, colour, joint limit, pose angle, timing and camera position for the robot lives here.
// Units are metres, radians and seconds. The robot faces +z (towards the camera); its left hand is at +x.

import type { ArmPose, RobotPose } from "./pose";
import type { PartialPose } from "./poseMath";

export const COLORS = {
  shell: "#f2efe8", // matte ivory body
  joint: "#1b2e50", // navy joints
  gold: "#c9a227", // small accents
  visor: "#132036", // the dark face plate and the eyelids
  eyeWhite: "#f6f3ec",
  iris: "#b8901f",
  irisRing: "#e2c25a",
  pupil: "#0a0f1a",
  lip: "#e6dccf",
  mouthInside: "#05080f",
  chestGlass: "#0b1424",
  wood: "#5a3d29",
  woodDark: "#3f2a1c",
  leather: "#23463c",
  paper: "#f7f3ea",
  floor: "#0d1729",
  wall: "#1a2b4c",
  lampLight: "#ffd6a0",
} as const;

/** Where things sit in the room. */
export const ROOM = {
  deskTop: 0.725, // height of the desk surface
  deskCentreZ: 0.1,
  deskSize: [2.0, 0.05, 0.8] as const,
  robotZ: -0.45, // the robot sits behind the desk
  paper: { position: [0.03, 0.727, 0.08] as const, turn: 0.06, size: [0.3, 0.212] as const },
  lamp: { position: [0.62, 0.725, -0.08] as const },
  books: { position: [-0.62, 0.725, -0.12] as const },
};

/** Robot body measurements, relative to each joint's parent. */
export const BODY = {
  waistY: 0.62, // the spine pivot, just below the desk top
  torsoScale: [1.15, 1, 0.72] as const,
  shoulderY: 0.47,
  shoulderX: 0.235,
  neckY: 0.53,
  neckLength: 0.075,
  head: {
    centreY: 0.15, // skull centre above the head pivot
    radius: 0.16,
    scale: [1.12, 1, 1.02] as const,
    visorRadius: 0.163,
  },
  eye: { x: 0.058, y: 0.175, z: 0.1456, radius: 0.028 },
  brow: { x: 0.06, y: 0.226, z: 0.141, size: [0.05, 0.009, 0.008] as const },
  mouth: { y: 0.08, z: 0.146 },
  // Deep in the head, so the lower lip drops nearly straight down instead of swinging back into the face.
  jawPivot: { y: 0.1, z: 0.026 },
  upperArm: { length: 0.26, radius: 0.04 },
  forearm: { length: 0.24, radius: 0.035 },
  palm: { size: [0.07, 0.075, 0.026] as const },
  finger: { radius: 0.0095, base: 0.026, tip: 0.022, spread: 0.022 },
};

/** How far joints may move, so poses from later layers stay believable. */
export const LIMITS = {
  jawOpen: 0.15, // radians at mouth.open = 1 (the lower lip drops about 1.8 cm)
  upperLidOpen: 1.05, // radians the upper lid tilts back when fully open
  lowerLidOpen: 0.75,
  fingerBase: 1.1, // radians at curl = 1
  fingerTip: 1.3,
  thumb: 0.9,
  shrug: 0.02, // metres the shoulders rise at shrug = 1
};

/** Joint names. Robot parts put these on their groups; the pose code finds them by name. */
export const JOINT = {
  spine: "spine",
  chest: "chest",
  neck: "neck",
  head: "head",
  eyeL: "eye-left",
  eyeR: "eye-right",
  upperLidL: "lid-upper-left",
  lowerLidL: "lid-lower-left",
  upperLidR: "lid-upper-right",
  lowerLidR: "lid-lower-right",
  browL: "brow-left",
  browR: "brow-right",
  jaw: "jaw",
  upperLip: "lip-upper",
  lowerLip: "lip-lower",
  mouthInside: "mouth-inside",
  chestPanel: "chest-panel",
} as const;

export type Side = "left" | "right";

/** Arm joint names for one side. */
export const armJoint = (side: Side) => ({
  shoulder: `${side}-shoulder`,
  elbow: `${side}-elbow`,
  wrist: `${side}-wrist`,
  thumbBase: `${side}-thumb-base`,
  thumbTip: `${side}-thumb-tip`,
  fingerBase: (i: number) => `${side}-finger-${i}-base`,
  fingerTip: (i: number) => `${side}-finger-${i}-tip`,
  grip: `${side}-grip`,
});

/** Sitting at the desk: forearms resting on it, head turned a little towards the camera, a gentle smile. */
export const REST_POSE: RobotPose = {
  spine: [0.06, 0, 0],
  neck: [0.04, 0.06, 0],
  head: [0.05, 0.1, 0.02],
  gaze: { yaw: 0.1, pitch: 0.02 },
  lids: { upper: 0.12, lower: 0.05 },
  brows: { raise: 0, tilt: 0.04 },
  mouth: { open: 0, smile: 0.35, wide: 0, round: 0, press: 0 },
  armL: { shoulder: [-0.35, 0, 0.12], elbow: -0.72, wrist: [-0.5, 0, 0], curl: 0.25, thumb: 0.2 },
  armR: { shoulder: [-0.35, 0, 0.12], elbow: -0.72, wrist: [-0.5, 0, 0], curl: 0.25, thumb: 0.2 },
  breath: 0,
  shrug: 0,
};

// ─── Motion (Phase 6) ────────────────────────────────────────────────────────────────────────────

/** [shoulder x, y, z, elbow, wrist x, y, z] plus finger curl and thumb. */
const arm = (a: readonly number[], curl: number, thumb: number): ArmPose => ({
  shoulder: [a[0], a[1], a[2]],
  elbow: a[3],
  wrist: [a[4], a[5], a[6]],
  curl,
  thumb,
});

/** How the right hand holds the paper: a light pinch, fingertips just touching the page. */
const HOLD_CURL = 0.3;
const HOLD_THUMB = 0.65;

/**
 * Key poses for the paper choreography. Each one only lists the joints it moves. The arm angles come
 * from a small inverse-kinematics search, so the hand really meets the paper's edge on the desk and
 * the page ends up facing the robot's eyes.
 */
const GRIP_ANGLES = [-0.73, -0.128, -0.346, -0.585, -0.401, -0.224, 0.169];

export const KEY_POSES = {
  /** Leaning over the desk to look at the paper. */
  lookDesk: { spine: [0.2, -0.06, 0], neck: [0.14, -0.05, 0], head: [0.26, -0.08, 0] },
  /** The right hand just above the paper's right edge, fingers open. */
  hover: { armR: arm([-0.674, -0.188, -0.339, -0.931, -0.194, -0.178, 0.16], 0.05, 0.15) },
  /** The right hand on the paper's edge (open, then holding). */
  grip: { armR: arm(GRIP_ANGLES, 0.05, 0.15) },
  gripHeld: { armR: arm(GRIP_ANGLES, HOLD_CURL, HOLD_THUMB) },
  gripClosed: { armR: { curl: HOLD_CURL, thumb: HOLD_THUMB } },
  gripOpen: { armR: { curl: 0.05, thumb: 0.15 } },
  /** Halfway up, the page tipping towards the robot. */
  liftBody: { spine: [0.1, -0.03, 0], neck: [0.1, -0.02, 0], head: [0.18, -0.04, 0] },
  liftR: { armR: arm([-0.419, -0.254, -0.205, -1.572, -0.201, -0.172, 0.139], HOLD_CURL, HOLD_THUMB) },
  /** Reading: the page in front of the chest, facing the eyes, a hand on each side. */
  read: {
    spine: [0.04, 0, 0],
    neck: [0.06, 0, 0],
    head: [0.12, 0, 0],
    armR: arm([-0.947, -0.222, -0.332, -1.523, -0.162, -0.214, 0.128], HOLD_CURL, HOLD_THUMB),
  },
  readL: { armL: arm([-0.873, -0.26, -0.242, -1.692, -0.15, -0.345, 0.171], HOLD_CURL, HOLD_THUMB) },
  /** Speaking: head up towards the viewer. */
  speak: { spine: [0.03, 0, 0], neck: [0.02, 0.06, 0], head: [-0.02, 0.1, 0] },
  /** The page lowered to the right and held fairly upright, so the chest light shows past it. */
  speakR: { armR: arm([-0.12, 0.19, 0.196, -1.514, -1.03, 0.037, 0.04], HOLD_CURL, HOLD_THUMB) },
  /** The free left hand while speaking: forearm forward and a little up, palm turned in, ready to gesture. */
  gestureL: { armL: arm([-0.5, 0.25, 0.25, -1.4, -0.1, 1.1, 0], 0.35, 0.25) },
  /** Back to the resting pose, in parts. */
  restBody: { spine: REST_POSE.spine, neck: REST_POSE.neck, head: REST_POSE.head, gaze: REST_POSE.gaze, breath: 0, shrug: 0 },
  restL: { armL: REST_POSE.armL },
  restR: { armR: REST_POSE.armR },
} satisfies Record<string, PartialPose>;

/** Where on the page (metres from its centre; +u = page right, +v = page top) the right hand holds it. */
export const PAPER_GRIP_SPOT = { u: 0.105, v: -0.06 };

/** The paper's position and turn relative to the right hand's grip point while it is held. */
export const PAPER_HOLD = {
  position: [PAPER_GRIP_SPOT.u, PAPER_GRIP_SPOT.v, -0.002] as const,
  rotation: [0, 0, Math.PI] as const,
};

/** Moving the whole body: the eyes lead, the head follows about 150 ms later, then the body. */
export const MOTION = {
  /** Seconds each body part starts after the first one. */
  lead: {
    gaze: 0,
    lids: 0,
    brows: 0.04,
    mouth: 0.05,
    neck: 0.12,
    head: 0.15,
    spine: 0.24,
    breath: 0,
    shrug: 0.06,
    shoulder: 0,
    elbow: 0.07,
    wrist: 0.14,
    hand: 0.2,
  } as Record<string, number>,
  /** Never linear. The wrist overshoots a little, so the hand settles with some follow-through. */
  ease: {
    default: "sine.inOut",
    shoulder: "power2.inOut",
    elbow: "power2.inOut",
    wrist: "back.out(1.3)",
    hand: "power2.out",
  } as Record<string, string>,
};

/** Seconds at 1× speed. The presenter's speed setting scales all of these. */
// "…At" is when a move starts (from the start of the scene), the plain name is how long it takes.
export const CHOREO = {
  pickUp: {
    look: 0.7, // look down at the paper (the body follows the eyes)
    reachAt: 0.3, reach: 0.75, // the right hand moves over the paper's edge
    lowerAt: 1.0, lower: 0.3, // and down onto it
    closeAt: 1.3, close: 0.2, // fingers close
    attachAt: 1.42, attach: 0.18, // the paper is now in the hand
    liftAt: 1.5, lift: 0.7, // up and tipping towards the robot
    readAt: 2.05, read: 0.65, // into the reading position
    otherHandAt: 2.0, otherHand: 0.85, // the left hand comes up to hold the other side
    done: 2.7,
  },
  /** "Play voice" with the paper still on the desk: the same pick-up, a little quicker. */
  quickPickUp: 0.7,
  speak: {
    look: 0.2, // eyes up to the viewer first
    body: 0.6, // then the head and body
    lowerPaper: 0.7,
    breathAt: 0.15, breathIn: 0.5,
    readyAt: 0.85, // the voice starts here
    freeHandAt: 0.35, freeHand: 0.8, // the left hand lets go of the page
    gestureAt: 1.0,
    breathOut: 1.6,
  },
  putBack: {
    pause: 0.6, // a short pause after the last word
    look: 0.7,
    otherHandAt: 0.1,
    liftAt: 0.2, lift: 0.6,
    lowerAt: 0.75, lower: 0.6,
    releaseAt: 1.4, release: 0.18,
    clearAt: 1.55, clear: 0.3, // the hand lifts off the paper
    restAt: 1.8, rest: 0.8,
    lookUpAt: 1.9,
  },
  rest: 0.8,
};

/** The reading loop: the eyes jump along each line in small steps, with a little nod at each line's end. */
export const READING = {
  /** A quick eye jump to the next word. */
  saccade: 0.07,
  /** The longer jump back to the start of the next line. */
  returnSweep: 0.16,
  /** How long the eyes rest on each spot; cycled so the rhythm never repeats exactly. */
  fixations: [0.24, 0.3, 0.27, 0.34, 0.22, 0.29, 0.26],
  /** Metres of text per eye stop. */
  fixationSpacing: 0.05,
  /** The head turns this many radians per metre the eyes move along a line. */
  headFollow: 0.9,
  nod: 0.035,
  /** Rest after the last line, before reading again from the top. */
  pageEndPause: 0.7,
};

/** Lip-sync from the shared AnalyserNode. */
export const LIP_SYNC = {
  attack: 0.04, // seconds for the jaw to open
  release: 0.09, // and to close
  shapeTime: 0.06, // smoothing of the round/wide lip shape
  /** Below this share of the recent loudest moment counts as silence (the lips close). */
  gate: 0.14,
  minGate: 0.006,
  /** How fast the remembered "loudest moment" fades, in seconds. */
  peakMemory: 1.6,
  openCurve: 0.75,
  bandsHz: { low: [250, 1000], high: [1600, 3800] },
  /** How strongly the low/high balance moves away from its running average shows on the lips. */
  shapeGain: 4.5,
  shapeAverageTime: 1.2,
  /** A short press of the lips when sound starts suddenly after a pause (like p, b, m). */
  press: { afterSilence: 0.08, amount: 0.8, time: 0.07 },
  jitter: 0.06,
  /** Strong syllables: a small nod, a brow lift on the loudest ones, a beat of the free hand. */
  accent: { threshold: 0.72, gap: 0.22, nodKick: 0.55, browLift: 0.0025, browTime: 0.25, beatKick: 1.6 },
  nodSpring: { stiffness: 140, damping: 11 },
  beatSpring: { stiffness: 55, damping: 7 },
  /** While speaking, the resting smile relaxes a little so the lips can shape the sounds. */
  smileWhileOpen: 0.3,
};

/** Life when nothing else is happening: blinks, breathing, tiny eye jumps, weight shifts, mouse follow. */
export const IDLE = {
  blink: { min: 2, max: 6, close: 0.08, open: 0.15, doubleChance: 0.2, doubleGap: 0.12 },
  breath: { rate: 0.25, amount: 0.8, lean: 0.008 },
  saccade: { min: 0.4, max: 2, yaw: 0.025, pitch: 0.018, speed: 30 },
  weightShift: { min: 4, max: 8, spineTilt: 0.02, spineTurn: 0.025, headTilt: 0.03, speed: 1.2 },
  follow: {
    /** Share of the turn towards the pointer done by the head and neck (the eyes do the rest). */
    head: 0.35,
    neck: 0.15,
    maxYaw: 0.7,
    maxPitch: 0.45,
    speed: 2.5,
    eyeSpeed: 14,
    /** Seconds without pointer movement before the robot looks back at the viewer. */
    idleAfter: 4,
    /** The robot looks at a point this share of the way from the camera to itself. */
    depth: 0.6,
  },
  /** The upper lids follow the eyes down a little, as real lids do. */
  lidFollowsGaze: 0.35,
  /** Fear: a small fast shake in the hands. */
  tremble: { rate: 9, amount: 0.014 },
};

/** The robot's face shows the emotion from IndicBERT step 9 ("Predicted emotion") onwards. */
export const EMOTION_REVEAL_STEP = 8;

/** Eye limits for any look-at (radians, relative to the head). */
export const GAZE_LIMITS = { yaw: 0.6, up: 0.5, down: 0.85 };

/** The normal camera: a slight three-quarter view of the robot at its desk. */
export const CAMERA = {
  fov: 30,
  target: [0, 1.06, -0.2] as const,
  azimuth: 0.32, // radians to the robot's left (+x)
  baseDistance: 3.1,
  baseHeight: 1.55,
  /** About this much of the scene's width (metres) always fits in view: robot, paper, lamp and books. */
  fitWidth: 1.5,
};

export type CameraView = "front" | "threeQuarter" | "side" | "face" | "paper";

/** The angles offered in ?debug=1: three around the robot, plus close-ups of the face and the paper. */
export const DEBUG_VIEWS: Record<CameraView, { label: string; position: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  front: { label: "Front", position: [0, 1.35, 2.6], target: [0, 1.05, -0.3] },
  threeQuarter: { label: "Three-quarter", position: [1.55, 1.5, 1.85], target: [0, 1.05, -0.3] },
  side: { label: "Side", position: [2.7, 1.3, -0.4], target: [0, 1.05, -0.35] },
  face: { label: "Face close-up", position: [0.1, 1.42, 0.45], target: [0, 1.37, -0.4] },
  // Over the robot's left shoulder: the page faces the robot, so this is the side the text reads from.
  paper: { label: "Paper", position: [0.3, 1.3, -0.25], target: [0.03, 0.73, 0.08] },
};
