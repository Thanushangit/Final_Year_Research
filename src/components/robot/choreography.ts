// The robot's acted scenes, as GSAP timelines: pick the paper up, read it, look up and speak, put it
// back. GSAP tweens plain numbers (pose "channels" and a few cues); the robot reads them every frame.
// A new scene always starts from wherever the robot is, so scenes can interrupt each other smoothly.
import { gsap } from "gsap";
import type { LineSpot } from "./Paper";
import { groupByPart, toChannels, type Channels, type PartialPose } from "./poseMath";
import { CHOREO, KEY_POSES, MOTION, PAPER_GRIP_SPOT, READING, REST_POSE } from "./robotConstants";

/** Numbers the scenes animate besides the joints. */
export interface Cues {
  /** 0 = the paper lies on the desk, 1 = it is in the right hand. */
  attach: number;
  /** How much the eyes look at the reading spot on the paper. */
  lookPaper: number;
  /** The reading spot, in metres from the page centre (+u = page right, +v = page top). */
  readU: number;
  readV: number;
  /** How much the eyes look at the viewer (the camera). */
  lookCamera: number;
  /** How much the eyes and head may follow the mouse pointer (only at rest). */
  follow: number;
  /** How free the left hand is to gesture while speaking. */
  gesture: number;
}

export type SceneName = "rest" | "read" | "speak" | "putBack";

export interface SceneOptions {
  /** Where the lines of text are on the page (the eyes follow them while reading). */
  lines?: LineSpot[];
  /** Called when the robot has looked up and breathed in, ready for the voice. */
  onReady?: () => void;
  onBlink?: () => void;
}

type Timeline = gsap.core.Timeline;

const REST_CUES: Cues = { attach: 0, lookPaper: 0, readU: PAPER_GRIP_SPOT.u, readV: PAPER_GRIP_SPOT.v, lookCamera: 0, follow: 1, gesture: 0 };

/** Something to read on an empty page. */
const BLANK_PAGE: LineSpot[] = [{ v: 0.06, uStart: -0.125, uEnd: 0.1 }];

export class Choreographer {
  readonly channels: Channels = toChannels(REST_POSE);
  readonly cues: Cues = { ...REST_CUES };
  scene: SceneName = "rest";
  private timeline: Timeline | null = null;
  private holding = false;
  private speed = 1;
  private tempo = 1;

  play(scene: SceneName, options: SceneOptions = {}): void {
    this.timeline?.kill();
    this.scene = scene;
    const tl = gsap.timeline();
    // A scene cut short halfway through taking or letting go of the paper finishes that first.
    tl.to(this.cues, { attach: this.holding ? 1 : 0, duration: 0.15, ease: "sine.out" }, 0);

    if (scene === "read") {
      const start = this.holding ? this.lookAtPaper(tl, 0) : this.pickUp(tl, 0, 1);
      tl.add(this.readLoop(options.lines?.length ? options.lines : BLANK_PAGE, options.onBlink), start);
    } else if (scene === "speak") {
      const start = this.holding ? 0 : this.pickUp(tl, 0, CHOREO.quickPickUp);
      this.speak(tl, start, options.onReady);
    } else if (scene === "putBack") {
      if (this.holding) this.putBack(tl, CHOREO.putBack.pause);
      else this.toRest(tl, 0);
    } else if (this.holding) {
      this.putBack(tl, 0);
    } else {
      this.toRest(tl, 0);
    }

    tl.timeScale(this.speed * this.tempo);
    this.timeline = tl;
  }

  /** The presenter's speed setting. */
  setSpeed(speed: number): void {
    this.speed = speed;
    this.timeline?.timeScale(this.speed * this.tempo);
  }

  /** The emotion's own pace (sadness is slower). Called every frame, so it only acts on real changes. */
  setTempo(tempo: number): void {
    if (Math.abs(tempo - this.tempo) < 0.005) return;
    this.tempo = tempo;
    this.timeline?.timeScale(this.speed * this.tempo);
  }

  stop(): void {
    this.timeline?.kill();
    this.timeline = null;
  }

  /** Moves the listed joints towards `target`, each body part starting a little after the one before. */
  private poseTo(tl: Timeline, target: PartialPose, at: number, duration: number, staggered = true): void {
    for (const [part, values] of groupByPart(toChannels(target))) {
      const ease = MOTION.ease[part] ?? MOTION.ease.default;
      tl.to(this.channels, { ...values, duration, ease }, at + (staggered ? (MOTION.lead[part] ?? 0) : 0));
    }
  }

  /** Look down, reach, grip, lift, and hold the page up with both hands. Returns when it is done. */
  private pickUp(tl: Timeline, start: number, scale: number): number {
    const c = CHOREO.pickUp;
    const at = (time: number) => start + time * scale;
    tl.set(this.cues, { readU: PAPER_GRIP_SPOT.u, readV: PAPER_GRIP_SPOT.v }, start);
    tl.to(this.cues, { lookPaper: 1, lookCamera: 0, follow: 0, gesture: 0, duration: 0.25 * scale, ease: "power2.out" }, start);
    this.poseTo(tl, KEY_POSES.lookDesk, start, c.look * scale);
    this.poseTo(tl, KEY_POSES.hover, at(c.reachAt), c.reach * scale);
    this.poseTo(tl, KEY_POSES.grip, at(c.lowerAt), c.lower * scale);
    this.poseTo(tl, KEY_POSES.gripClosed, at(c.closeAt), c.close * scale, false);
    tl.call(() => void (this.holding = true), [], at(c.attachAt));
    tl.to(this.cues, { attach: 1, duration: c.attach * scale, ease: "power1.inOut" }, at(c.attachAt));
    this.poseTo(tl, KEY_POSES.liftBody, at(c.liftAt), c.lift * scale);
    this.poseTo(tl, KEY_POSES.liftR, at(c.liftAt), c.lift * scale);
    tl.to(this.cues, { readU: 0, readV: 0.03, duration: c.lift * scale }, at(c.liftAt));
    this.poseTo(tl, KEY_POSES.read, at(c.readAt), c.read * scale);
    this.poseTo(tl, KEY_POSES.readL, at(c.otherHandAt), c.otherHand * scale);
    return at(c.done);
  }

  /** Already holding the page (a replay, or after speaking): bring it back up and look at it. */
  private lookAtPaper(tl: Timeline, start: number): number {
    tl.to(this.cues, { lookPaper: 1, lookCamera: 0, follow: 0, gesture: 0, readU: 0, readV: 0.03, duration: 0.3, ease: "power2.out" }, start);
    this.poseTo(tl, KEY_POSES.read, start, 0.7);
    this.poseTo(tl, KEY_POSES.readL, start + 0.1, 0.8);
    return start + 0.9;
  }

  /**
   * The eyes jump along each line in small steps and rest on each spot; the head turns a little with
   * them and nods at the end of each line. Then back to the top, with a blink. Repeats until stopped.
   */
  private readLoop(lines: LineSpot[], onBlink?: () => void): Timeline {
    const loop = gsap.timeline({ repeat: -1 });
    const headPitch = KEY_POSES.read.head[0];
    const headYaw = (u: number) => -u * READING.headFollow;
    let t = 0;
    let stopCount = 0;
    for (const line of lines) {
      const lineStart = t;
      const stops = Math.max(2, Math.round((line.uEnd - line.uStart) / READING.fixationSpacing));
      for (let k = 0; k < stops; k++) {
        const u = line.uStart + ((k + 0.5) / stops) * (line.uEnd - line.uStart);
        const jump = k === 0 ? READING.returnSweep : READING.saccade;
        loop.to(this.cues, { readU: u, readV: line.v, duration: jump, ease: "power2.out" }, t);
        t += jump + READING.fixations[stopCount++ % READING.fixations.length];
      }
      loop.to(this.channels, { "head.1": headYaw(line.uStart), duration: 0.3, ease: "sine.inOut" }, lineStart);
      loop.to(this.channels, { "head.1": headYaw(line.uEnd), duration: t - lineStart - 0.3, ease: "sine.inOut" }, lineStart + 0.3);
      loop.to(this.channels, { "head.0": headPitch + READING.nod, duration: 0.16, ease: "sine.out" }, t - 0.12);
      loop.to(this.channels, { "head.0": headPitch, duration: 0.3, ease: "sine.inOut" }, t + 0.04);
    }
    if (onBlink) loop.call(onBlink, [], t + 0.1);
    loop.to({}, { duration: READING.pageEndPause }, t);
    return loop;
  }

  /** Lower the page, look up at the viewer (eyes first), breathe in, then let go with the left hand. */
  private speak(tl: Timeline, start: number, onReady?: () => void): void {
    const c = CHOREO.speak;
    tl.to(this.cues, { lookPaper: 0, lookCamera: 1, follow: 0, duration: c.look, ease: "power2.out" }, start);
    this.poseTo(tl, KEY_POSES.speak, start, c.body);
    this.poseTo(tl, KEY_POSES.speakR, start + 0.05, c.lowerPaper);
    tl.to(this.channels, { breath: 1, shrug: 0.35, duration: c.breathIn, ease: "sine.inOut" }, start + c.breathAt);
    if (onReady) tl.call(onReady, [], start + c.readyAt);
    tl.to(this.channels, { breath: 0.15, shrug: 0, duration: c.breathOut, ease: "sine.out" }, start + c.readyAt + 0.05);
    this.poseTo(tl, KEY_POSES.gestureL, start + c.freeHandAt, c.freeHand);
    tl.to(this.cues, { gesture: 1, duration: 0.5 }, start + c.gestureAt);
  }

  /** After a short pause: put the paper back on the desk, let go, and return to rest. */
  private putBack(tl: Timeline, start: number): void {
    const c = CHOREO.putBack;
    tl.to(this.cues, { gesture: 0, duration: 0.4 }, 0);
    tl.to(this.cues, { lookCamera: 0, lookPaper: 1, readU: 0, readV: 0, duration: 0.3, ease: "power2.out" }, start);
    this.poseTo(tl, KEY_POSES.lookDesk, start, c.look);
    this.poseTo(tl, KEY_POSES.restL, start + c.otherHandAt, 0.8);
    this.poseTo(tl, KEY_POSES.liftR, start + c.liftAt, c.lift);
    this.poseTo(tl, KEY_POSES.gripHeld, start + c.lowerAt, c.lower);
    tl.call(() => void (this.holding = false), [], start + c.releaseAt);
    tl.to(this.cues, { attach: 0, duration: c.release, ease: "power1.inOut" }, start + c.releaseAt);
    this.poseTo(tl, KEY_POSES.gripOpen, start + c.releaseAt, c.release, false);
    this.poseTo(tl, KEY_POSES.hover, start + c.clearAt, c.clear);
    this.poseTo(tl, KEY_POSES.restR, start + c.restAt, c.rest);
    tl.to(this.cues, { lookPaper: 0, duration: 0.4 }, start + c.lookUpAt);
    this.poseTo(tl, KEY_POSES.restBody, start + c.lookUpAt, 0.8);
    tl.to(this.cues, { follow: 1, duration: 0.6 }, start + c.lookUpAt + 0.4);
  }

  private toRest(tl: Timeline, start: number): void {
    tl.to(this.cues, { lookPaper: 0, lookCamera: 0, gesture: 0, follow: 1, duration: 0.4 }, start);
    this.poseTo(tl, REST_POSE, start, CHOREO.rest);
  }
}
