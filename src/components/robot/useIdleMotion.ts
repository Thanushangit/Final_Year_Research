// Layer C, idle life: blinks, breathing, tiny eye jumps, small weight shifts, and (at rest) the eyes
// and head following the mouse pointer. Adds small offsets on top of whatever the robot is doing.
import { useEffect, useState } from "react";
import { MathUtils, Vector3, type Camera } from "three";
import type { RobotPose } from "./pose";
import { clamp } from "./poseMath";
import { IDLE } from "./robotConstants";

const between = (min: number, max: number) => min + Math.random() * (max - min);
const damp = (from: number, to: number, speed: number, dt: number) => MathUtils.damp(from, to, speed, dt);

export interface IdleContext {
  /** 0 to 1: how much the robot may follow the pointer (only when resting at the desk). */
  follow: number;
  /** 0 to 1: the eyes are busy reading, so the small eye jumps get smaller. */
  reading: number;
  camera: Camera;
  canvas: HTMLCanvasElement;
  /** World position of the head, to work out where the pointer is from the robot's point of view. */
  head: Vector3;
  reducedMotion: boolean;
}

const pointerRay = new Vector3();
const toCamera = new Vector3();
const toTarget = new Vector3();

const yawOf = (v: Vector3) => Math.atan2(v.x, v.z);
const pitchOf = (v: Vector3) => Math.atan2(v.y, Math.hypot(v.x, v.z));

export class IdleMotion {
  /** 0 = eyes open, 1 = closed. */
  blink = 0;
  /** Small extra eye angles, added after the eyes have aimed. */
  readonly saccade = { yaw: 0, pitch: 0 };
  /** Where the pointer is in the room, and how much the eyes should look at it. */
  readonly lookTarget = new Vector3();
  lookWeight = 0;

  private time = 0;
  private nextBlink = between(IDLE.blink.min, IDLE.blink.max);
  private blinkStart = -1;
  private secondBlink = false;
  private breathPhase = 0;
  private readonly saccadeGoal = { yaw: 0, pitch: 0 };
  private nextSaccade = 0;
  private readonly shift = { tilt: 0, turn: 0, headTilt: 0 };
  private readonly shiftGoal = { tilt: 0, turn: 0, headTilt: 0 };
  private nextShift = between(IDLE.weightShift.min, IDLE.weightShift.max);
  private readonly turn = { yaw: 0, pitch: 0 };
  private readonly pointer = { x: 0, y: 0, movedAt: -Infinity };

  /** Ask for a blink soon (the reading loop blinks when it goes back to the top of the page). */
  readonly requestBlink = (): void => {
    if (this.blinkStart < 0) this.nextBlink = Math.min(this.nextBlink, this.time + 0.05);
  };

  pointerMoved(clientX: number, clientY: number): void {
    this.pointer.x = clientX;
    this.pointer.y = clientY;
    this.pointer.movedAt = this.time;
  }

  update(pose: RobotPose, dt: number, context: IdleContext): void {
    this.time += dt;
    this.updateBlink();
    this.breathe(pose, dt);
    const lively = context.reducedMotion ? 0 : 1;
    this.updateSaccade(dt, lively * (1 - 0.6 * context.reading));
    this.shiftWeight(pose, dt, lively * (0.5 + 0.5 * context.follow));
    this.followPointer(pose, dt, context, lively * context.follow);
  }

  /** Fast close (80 ms), slower open (150 ms), now and then a double blink. */
  private updateBlink(): void {
    const { close, open, doubleChance, doubleGap, min, max } = IDLE.blink;
    if (this.blinkStart < 0 && this.time >= this.nextBlink) this.blinkStart = this.time;
    if (this.blinkStart < 0) {
      this.blink = 0;
      return;
    }
    const t = this.time - this.blinkStart;
    if (t < close) {
      this.blink = (t / close) ** 2;
    } else if (t < close + open) {
      this.blink = (1 - (t - close) / open) ** 2;
    } else {
      this.blink = 0;
      this.blinkStart = -1;
      const again = !this.secondBlink && Math.random() < doubleChance;
      this.secondBlink = again;
      this.nextBlink = this.time + (again ? doubleGap : between(min, max));
    }
  }

  /** Slow breathing (about one breath every four seconds): the chest and shoulders rise. */
  private breathe(pose: RobotPose, dt: number): void {
    this.breathPhase += dt * Math.PI * 2 * IDLE.breath.rate;
    const breath = (1 - Math.cos(this.breathPhase)) / 2;
    pose.breath += breath * IDLE.breath.amount;
    pose.shrug += breath * 0.1;
    pose.spine[0] -= breath * IDLE.breath.lean;
  }

  private updateSaccade(dt: number, amount: number): void {
    const s = IDLE.saccade;
    if (this.time >= this.nextSaccade) {
      this.saccadeGoal.yaw = between(-s.yaw, s.yaw);
      this.saccadeGoal.pitch = between(-s.pitch, s.pitch);
      this.nextSaccade = this.time + between(s.min, s.max);
    }
    this.saccade.yaw = damp(this.saccade.yaw, this.saccadeGoal.yaw * amount, s.speed, dt);
    this.saccade.pitch = damp(this.saccade.pitch, this.saccadeGoal.pitch * amount, s.speed, dt);
  }

  /** Every few seconds the body settles a little differently: a slight lean, turn and head tilt. */
  private shiftWeight(pose: RobotPose, dt: number, amount: number): void {
    const w = IDLE.weightShift;
    if (this.time >= this.nextShift) {
      this.shiftGoal.tilt = between(-w.spineTilt, w.spineTilt);
      this.shiftGoal.turn = between(-w.spineTurn, w.spineTurn);
      this.shiftGoal.headTilt = between(-w.headTilt, w.headTilt);
      this.nextShift = this.time + between(w.min, w.max);
    }
    this.shift.tilt = damp(this.shift.tilt, this.shiftGoal.tilt * amount, w.speed, dt);
    this.shift.turn = damp(this.shift.turn, this.shiftGoal.turn * amount, w.speed, dt);
    this.shift.headTilt = damp(this.shift.headTilt, this.shiftGoal.headTilt * amount, w.speed, dt);
    pose.spine[2] += this.shift.tilt;
    pose.spine[1] += this.shift.turn;
    pose.head[2] += this.shift.headTilt;
  }

  /**
   * At rest the robot looks towards the mouse pointer, anywhere on the page, as if the screen were a
   * window between it and the viewer. After a few seconds without movement it looks back at the viewer.
   */
  private followPointer(pose: RobotPose, dt: number, context: IdleContext, allowed: number): void {
    const f = IDLE.follow;
    const recent = this.time - this.pointer.movedAt < f.idleAfter ? 1 : 0;
    this.lookWeight = damp(this.lookWeight, allowed * recent, f.speed, dt);
    if (this.lookWeight > 0.001) {
      const rect = context.canvas.getBoundingClientRect();
      const x = ((this.pointer.x - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const y = -(((this.pointer.y - rect.top) / Math.max(1, rect.height)) * 2 - 1);
      const camera = context.camera.position;
      pointerRay.set(x, y, 0.5).unproject(context.camera).sub(camera).normalize();
      this.lookTarget.copy(camera).addScaledVector(pointerRay, camera.distanceTo(context.head) * f.depth);
      toCamera.subVectors(camera, context.head);
      toTarget.subVectors(this.lookTarget, context.head);
      const yaw = clamp(yawOf(toTarget) - yawOf(toCamera), -f.maxYaw, f.maxYaw);
      const pitch = clamp(pitchOf(toTarget) - pitchOf(toCamera), -f.maxPitch, f.maxPitch);
      this.turn.yaw = damp(this.turn.yaw, yaw * this.lookWeight, f.speed, dt);
      this.turn.pitch = damp(this.turn.pitch, pitch * this.lookWeight, f.speed, dt);
    } else {
      this.turn.yaw = damp(this.turn.yaw, 0, f.speed, dt);
      this.turn.pitch = damp(this.turn.pitch, 0, f.speed, dt);
    }
    // The head and neck take part of the turn (looking up is a negative tilt); the eyes aim exactly.
    pose.head[1] += this.turn.yaw * f.head;
    pose.neck[1] += this.turn.yaw * f.neck;
    pose.head[0] -= this.turn.pitch * f.head;
    pose.neck[0] -= this.turn.pitch * f.neck;
  }
}

/** One IdleMotion for the robot, fed with pointer moves from anywhere on the page. */
export function useIdleMotion(): IdleMotion {
  const [idle] = useState(() => new IdleMotion());
  useEffect(() => {
    const onMove = (event: PointerEvent) => idle.pointerMoved(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [idle]);
  return idle;
}
