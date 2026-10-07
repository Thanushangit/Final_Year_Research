// Every size, colour, joint limit, pose angle, timing and camera position for the robot lives here.
// Units are metres, radians and seconds. The robot faces +z (towards the camera); its left hand is at +x.

import type { ArmPose, RobotPose } from "./pose";
import type { PartialPose } from "./poseMath";

// Robot colours were picked from the reference image of the android.
export const COLORS = {
  armor: "#e6e1dc", // off-white plates
  mech: "#2a2724", // dark mechanics between the plates
  cable: "#161514", // glossy black cables
  metal: "#8e8a85", // rings and connectors
  screw: "#6f6b67",
  skinSheen: "#f2d9cf", // the soft glow at the skin's edges
  mouthInside: "#1a0d0c",
  teeth: "#e3ddd0",
  coreSlat: "#0d0c0b",
  gold: "#c9a227", // the core's glow before an emotion is known
  navy: "#1b2e50", // ink on the paper, a book, the lamp
  wood: "#5a3d29",
  woodDark: "#3f2a1c",
  leather: "#23463c",
  paper: "#f1e3c2", // warm cream, so the page stands apart from the robot's cool white fingers
  floor: "#4a3426", // oak floorboards
  wall: "#c9b8a2", // warm greige plaster, as in the study-room reference
  shelfWood: "#4b3020",
  shelfGlow: "#ffc98a", // the LED strips under each shelf
  window: "#f6f1e4",
  chair: "#23396a", // navy leather, as in the chair reference
  lampLight: "#ffd6a0",
} as const;

/**
 * The study room around the desk (from the study-room reference): a lit walnut bookshelf behind the robot,
 * a window, a framed picture and a big plant on a low cabinet to the left. Metres; the back wall faces +z.
 */
export const STUDY = {
  wallZ: -1.45,
  /** Board heights (tops) and upright positions; no upright sits right behind the robot's head. */
  shelf: { depth: 0.34, boards: [0.06, 0.62, 1.04, 1.46, 1.88, 2.3] as const, posts: [-0.8, 0.4, 1.6, 2.8] as const },
  window: { centre: [-2.3, 1.45] as const, size: [0.9, 1.3] as const },
  picture: { position: [-1.36, 1.42] as const, scale: 0.9 },
  cabinet: { centre: [-1.75, -1.2] as const, size: [1.3, 0.62, 0.42] as const },
  /** Executive chair: the back from the seat (bottom) up to about ear height, reclined a little (radians). */
  chair: { z: -0.82, width: 0.68, bottom: 0.6, height: 0.82, recline: 0.1 },
  /** Titles on the stack of books at the left end of the desk (bottom first). */
  bookTitles: ["Natural Language Processing", "Speech Synthesis", "Robotics", "Artificial Intelligence"] as const,
};

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

/**
 * Robot body measurements, relative to each joint's parent. The head and face are measured in
 * face/landmarks.ts (a real adult head, about 23 cm from chin to crown).
 */
export const BODY = {
  waistY: 0.62, // the spine pivot, just below the desk top
  shoulderY: 0.47,
  shoulderX: 0.235,
  neckY: 0.53,
  neckLength: 0.1, // a long mechanical neck, as in the reference
  upperArm: { length: 0.26 },
  forearm: { length: 0.24 },
  palm: { size: [0.08, 0.075, 0.026] as const },
  /** Four fingers, three segments each (lengths from the knuckle out). */
  finger: { radius: 0.0082, segments: [0.027, 0.02, 0.017] as const, spread: 0.0175 },
  /** Long enough to reach past the palm, so it can press a page from the front. */
  thumb: { segments: [0.025, 0.02, 0.016] as const },
};

/** How far joints may move, so poses from later layers stay believable. */
export const LIMITS = {
  fingerBase: 0.95, // radians at curl = 1, for each finger segment
  fingerMiddle: 1.15,
  fingerTip: 0.8,
  thumb: 0.9,
  shrug: 0.02, // metres the shoulders rise at shrug = 1
  lidWide: 0.2, // lids.upper = −0.2 lifts the upper lids fully
  browRaise: 0.0055, // metres of brows.raise for the full brow-lift shape
  browTilt: 0.3, // radians of brows.tilt for the full inner-up (or frown) shape
};

/** Joint and part names. Robot parts put these on their objects; the pose code finds them by name. */
export const JOINT = {
  spine: "spine",
  chest: "chest",
  neck: "neck",
  head: "head",
  eyeL: "eye-left",
  eyeR: "eye-right",
  face: "face",
  lidL: "lid-left",
  lidR: "lid-right",
  jaw: "jaw",
  chestPanel: "chest-panel",
} as const;

export type Side = "left" | "right";

/** Arm joint names for one side. Fingers 0–3 run from the thumb side; segments 0–2 from the knuckle out. */
export const armJoint = (side: Side) => ({
  shoulder: `${side}-shoulder`,
  elbow: `${side}-elbow`,
  wrist: `${side}-wrist`,
  thumb: (segment: number) => `${side}-thumb-${segment}`,
  finger: (i: number, segment: number) => `${side}-finger-${i}-${segment}`,
  grip: `${side}-grip`,
});

/** Sitting at the desk: forearms resting on it, head turned a little towards the camera, a calm face. */
export const REST_POSE: RobotPose = {
  spine: [0.06, 0, 0],
  neck: [0.04, 0.06, 0],
  head: [0.05, 0.1, 0.02],
  gaze: { yaw: 0.1, pitch: 0.02 },
  lids: { upper: 0.15, lower: 0.04 }, // relaxed, slightly heavy lids that cover the top of the iris

  brows: { raise: 0, tilt: 0.04 },
  mouth: { open: 0, smile: 0.12, wide: 0, round: 0, press: 0, frown: 0, sneer: 0, stretch: 0, cheek: 0 },
  // Hands lying on the desk: palms down, fingers relaxed with their tips just touching the wood
  // (solved so no part of the hand or forearm goes below the desk top).
  armL: { shoulder: [-0.257, -0.18, -0.025], elbow: -1.143, wrist: [-0.16, 0.089, -0.096], curl: 0.3, thumb: 0.2 },
  armR: { shoulder: [-0.257, -0.18, -0.025], elbow: -1.143, wrist: [-0.16, 0.089, -0.096], curl: 0.3, thumb: 0.2 },
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

/** Taking the paper from the desk: a light pinch, fingertips on the page. */
const HOLD_CURL = 0.2;
const HOLD_THUMB = 0.3;
/** Holding it up to read, like a person: fingers straight behind the page, the thumb in front of it. */
const READ_CURL = 0.04;
const READ_THUMB = 0.35;
/** The hand under the chin while thinking: a loose fist. */
const FIST_CURL = 0.62;
const FIST_THUMB = 0.45;

/**
 * Key poses for the paper choreography. Each one only lists the joints it moves. The arm angles come
 * from a small inverse-kinematics search, so the hand really meets the paper's edge on the desk, both
 * hands hold the same page, the page faces the robot's eyes, and the thinking fist touches the chin.
 */
const GRIP_ANGLES = [-0.73, -0.128, -0.346, -0.585, -0.401, -0.224, 0.169];

/** The body leaning a little forward to think, the head tipped onto the left hand. */
const THINK_BODY = { spine: [0.1, 0, 0], neck: [0.06, 0.04, 0], head: [0.03, 0.1, -0.06] } satisfies PartialPose;

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
  /** Reading: the page in front of the chest, facing the eyes, held by its two bottom corners. */
  read: {
    spine: [0.04, 0, 0],
    neck: [0.06, 0, 0],
    head: [0.12, 0, 0],
    armR: arm([-0.62, -0.181, -0.4, -1.408, -0.675, 2.737, 0.037], READ_CURL, READ_THUMB),
  },
  readL: { armL: arm([-0.601, -0.595, 0.096, -1.539, -0.42, 2.938, -0.588], READ_CURL, READ_THUMB) },
  /** Thinking (while VITS makes the voice): the page lowered in the right hand, the left fist under the chin. */
  think: THINK_BODY,
  thinkR: { armR: arm([-0.107, -0.333, 0.26, -1.638, -0.938, 2.682, -0.46], READ_CURL, READ_THUMB) },
  thinkL: { armL: arm([-0.903, -0.988, -0.4, -2.312, -0.332, 0.617, 0.166], FIST_CURL, FIST_THUMB) },
  /** Speaking: head up towards the viewer. */
  speak: { spine: [0.03, 0, 0], neck: [0.02, 0.06, 0], head: [-0.02, 0.1, 0] },
  /** The page lowered to the right and held fairly upright, so the chest light shows past it. */
  speakR: { armR: arm([-0.205, -0.346, 0.365, -1.138, -1.251, 2.739, -0.602], READ_CURL, READ_THUMB) },
  /** The free left hand while speaking: forearm forward and a little up, palm turned in, ready to gesture. */
  gestureL: { armL: arm([-0.5, 0.25, 0.25, -1.4, -0.1, 1.1, 0], 0.35, 0.25) },
  /** Back to the resting pose, in parts. */
  restBody: { spine: REST_POSE.spine, neck: REST_POSE.neck, head: REST_POSE.head, gaze: REST_POSE.gaze, breath: 0, shrug: 0 },
  restL: { armL: REST_POSE.armL },
  restR: { armR: REST_POSE.armR },
} satisfies Record<string, PartialPose>;

/** Where on the page (metres from its centre; +u = page right, +v = page top) the right hand holds it. */
export const PAPER_GRIP_SPOT = { u: 0.105, v: -0.06 };

/**
 * The paper's position and turn relative to the right hand's grip point while it is held.
 * pickUp: taken from the desk with the hand on top of the page. read: held up like a person reads a
 * letter, by the bottom right corner, the four fingers behind the page and the thumb in front of it
 * (the page's text faces the palm). The hand shifts from one to the other while lifting the page.
 */
export const PAPER_HOLD = {
  pickUp: { position: [PAPER_GRIP_SPOT.u, PAPER_GRIP_SPOT.v, -0.002] as const, rotation: [0, 0, Math.PI] as const },
  read: { position: [-0.1, -0.104, 0.0125] as const, rotation: [Math.PI, 0, 0] as const },
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
  /** The pick-up's hand shifts from the desk grip to the reading grip while the page comes up. */
  regrip: 0.9,
  think: {
    settle: 1.0, // the body leans in and the head tips
    freeHandAt: 0.15, freeHand: 1.1, // the left hand lets go of the page and comes up to the chin
    lowerPaper: 0.9,
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

/**
 * Thinking while VITS makes the voice: a loop of small beats, each with its own look and face.
 * Gaze is in radians (+yaw = the robot's left, +pitch = up); `paper` is a spot on the page to glance at.
 * Head changes stay small: the chin rests on the left hand.
 */
export const THINKING: Array<{
  hold: number;
  gaze?: { yaw: number; pitch: number };
  paper?: { u: number; v: number };
  face: PartialPose;
  head?: [number, number];
  tap?: number;
}> = [
  // Looks up and away, concentrating: brows drawn together a little, lips pressed.
  { hold: 2.2, gaze: { yaw: 0.32, pitch: 0.3 }, face: { brows: { raise: 0, tilt: -0.1 }, mouth: { press: 0.3, round: 0, smile: 0.04 } }, head: [-0.02, 0.02] },
  // Fingers tap the cheek twice.
  { hold: 0.9, face: {}, tap: 2 },
  // A glance down at the page.
  { hold: 1.5, paper: { u: 0.02, v: 0.05 }, face: { brows: { raise: 0.0005, tilt: 0 }, mouth: { press: 0.12, round: 0, smile: 0.06 } }, head: [0.03, -0.05] },
  // Up the other way, lips pursed: "hmm".
  { hold: 1.9, gaze: { yaw: -0.22, pitch: 0.24 }, face: { brows: { raise: 0.0012, tilt: 0.06 }, mouth: { press: 0, round: 0.28, smile: 0 } }, head: [-0.015, -0.01] },
  // The idea arrives: brows lift, a small smile, a little nod.
  { hold: 1.3, gaze: { yaw: 0.06, pitch: 0.04 }, face: { brows: { raise: 0.0025, tilt: 0.02 }, mouth: { press: 0, round: 0, smile: 0.22 } }, head: [0.03, 0] },
  { hold: 1.0, gaze: { yaw: 0.1, pitch: 0.1 }, face: { brows: { raise: 0.0008, tilt: 0 }, mouth: { press: 0.1, round: 0, smile: 0.14 } }, head: [0, 0] },
];

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

export type CameraView = "front" | "threeQuarter" | "side" | "portrait" | "face" | "hands" | "paper";

/** The angles offered in ?debug=1: three around the robot, a portrait like the reference image, and close-ups. */
export const DEBUG_VIEWS: Record<CameraView, { label: string; position: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  front: { label: "Front", position: [0, 1.35, 2.6], target: [0, 1.05, -0.3] },
  threeQuarter: { label: "Three-quarter", position: [1.55, 1.5, 1.85], target: [0, 1.05, -0.3] },
  side: { label: "Side", position: [2.7, 1.3, -0.4], target: [0, 1.05, -0.35] },
  portrait: { label: "Portrait", position: [0, 1.2, 1.0], target: [0, 1.13, -0.45] },
  face: { label: "Face close-up", position: [0.06, 1.33, 0.26], target: [0, 1.3, -0.38] },
  hands: { label: "Hands", position: [0.32, 1.02, 0.22], target: [0.12, 0.77, -0.16] },
  // Over the robot's left shoulder: the page faces the robot, so this is the side the text reads from.
  paper: { label: "Paper", position: [0.3, 1.3, -0.25], target: [0.03, 0.73, 0.08] },
};
