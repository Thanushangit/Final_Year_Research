// Layer B, lip-sync: reads the shared AnalyserNode (the same sound the speakers play) every frame.
// Loudness opens the jaw (fast attack, slower release); the balance of low and high frequencies shapes
// the lips (low = rounder, high = wider); silence closes them. Strong syllables add a small nod, a brow
// lift and a beat of the free hand. The levels adapt to the voice, so any loudness works.
import { useState } from "react";
import { audioEngine } from "@/lib/audio/audioEngine";
import type { EmotionMotion } from "./emotionPose";
import type { RobotPose } from "./pose";
import { clamp } from "./poseMath";
import { LIP_SYNC } from "./robotConstants";

/** Approach `target` with a time constant in seconds. */
const follow = (value: number, target: number, seconds: number, dt: number) => value + (target - value) * (1 - Math.exp(-dt / seconds));

/** A small spring for nods and hand beats: kicked on accents, it swings and settles. */
class Spring {
  x = 0;
  private v = 0;
  kick(amount: number): void {
    this.v += amount;
  }
  step(dt: number, stiffness: number, damping: number): void {
    // Small steps keep the spring steady even when the frame rate drops.
    for (let left = dt; left > 0; left -= 0.016) {
      const h = Math.min(0.016, left);
      this.v += (-stiffness * this.x - damping * this.v) * h;
      this.x += this.v * h;
    }
  }
}

interface LipSyncContext {
  /** 0 to 1: how free the left hand is to gesture. */
  gesture: number;
  motion: EmotionMotion;
}

export class LipSync {
  /** Smoothed loudness of the voice (0 to about 0.5). The chest light uses it too. */
  level = 0;
  private open = 0;
  private wide = 0;
  private round = 0;
  private press = 0;
  private peak = 0.05;
  private silentFor = 1;
  private balance = 0.5;
  private talking = 0;
  private brow = 0;
  private sinceAccent = 1;
  private wasLoud = false;
  private time = 0;
  private rms = 0;
  private highShare = 0.5;
  private readonly nod = new Spring();
  private readonly beat = new Spring();
  private samples: Uint8Array<ArrayBuffer> | null = null;
  private spectrum: Uint8Array<ArrayBuffer> | null = null;

  update(pose: RobotPose, dt: number, context: LipSyncContext): void {
    this.time += dt;
    this.listen();
    const { rms, highShare: balance } = this;
    const L = LIP_SYNC;

    // Loudness against the loudest recent moment, so quiet and loud voices both move the jaw fully.
    this.peak = Math.max(rms, this.peak * Math.exp(-dt / L.peakMemory), 0.02);
    const gate = Math.max(L.minGate, this.peak * L.gate);
    const voiced = rms > gate;
    const jitter = 1 + L.jitter * Math.sin(this.time * 13.7) * Math.sin(this.time * 4.3 + 1);
    const target = voiced ? clamp(((rms - gate) / (this.peak - gate)) ** L.openCurve * jitter, 0, 1) : 0;

    // A sudden start after a pause gets a quick press of the lips first, like p, b or m.
    if (voiced && this.silentFor > L.press.afterSilence) this.press = L.press.amount;
    this.silentFor = voiced ? 0 : this.silentFor + dt;
    this.press *= Math.exp(-dt / L.press.time);

    this.open = follow(this.open, target, target > this.open ? L.attack : L.release, dt);
    if (!voiced && this.open < 0.02) this.open = 0; // fully closed in the pauses between words

    // Lip shape: how far the low/high balance is from its running average.
    if (voiced) this.balance = follow(this.balance, balance, L.shapeAverageTime, dt);
    const shape = voiced ? (balance - this.balance) * L.shapeGain : 0;
    const wobble = 0.08 * Math.sin(this.time * 7.1 + 2);
    this.wide = follow(this.wide, clamp(shape + wobble * this.open, 0, 1), L.shapeTime, dt);
    this.round = follow(this.round, clamp(-shape - wobble * this.open, 0, 1), L.shapeTime, dt);
    this.level = follow(this.level, rms, 0.05, dt);
    this.talking = follow(this.talking, audioEngine.isPlaying ? 1 : 0, 0.4, dt);

    this.accents(dt, context.motion);

    pose.mouth.open += this.open;
    pose.mouth.wide += this.wide;
    pose.mouth.round += this.round;
    pose.mouth.press += this.press;
    pose.mouth.smile -= L.smileWhileOpen * this.open;
    pose.head[0] += this.nod.x;
    pose.brows.raise += this.brow;

    // The free hand: small beats on strong syllables and a slow drift while talking.
    const hand = context.gesture * this.talking * context.motion.gesture;
    pose.armL.elbow -= this.beat.x * 0.12 * context.gesture;
    pose.armL.wrist[0] += this.beat.x * 0.1 * context.gesture;
    pose.armL.shoulder[2] += 0.04 * Math.sin(this.time * 0.7) * hand;
    pose.armL.wrist[1] += 0.15 * Math.sin(this.time * 0.53 + 1) * hand;
  }

  /** Strong syllables: rising past most of the recent peak, not too soon after the last one. */
  private accents(dt: number, motion: EmotionMotion): void {
    const a = LIP_SYNC.accent;
    this.sinceAccent += dt;
    const loud = this.level > this.peak * a.threshold;
    if (loud && !this.wasLoud && this.sinceAccent > a.gap) {
      this.sinceAccent = 0;
      this.nod.kick(a.nodKick * motion.gesture);
      this.beat.kick(a.beatKick * motion.gesture);
      if (this.level > this.peak * 0.9) this.brow = a.browLift;
    }
    this.wasLoud = loud;
    this.brow *= Math.exp(-dt / a.browTime);
    // Anger is sharper (stiffer), happiness bouncier (less damping), sadness slower.
    const n = LIP_SYNC.nodSpring;
    const b = LIP_SYNC.beatSpring;
    this.nod.step(dt, n.stiffness * motion.sharpness, (n.damping * Math.sqrt(motion.sharpness)) / motion.bounce);
    this.beat.step(dt, b.stiffness * motion.sharpness, (b.damping * Math.sqrt(motion.sharpness)) / motion.bounce);
  }

  /** Reads loudness (RMS) and the share of energy in the high band from the shared analyser. */
  private listen(): void {
    const analyser = audioEngine.analyserNode;
    if (!analyser || !audioEngine.isPlaying) {
      this.rms = 0;
      return;
    }
    this.samples ??= new Uint8Array(analyser.fftSize);
    this.spectrum ??= new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(this.samples);
    analyser.getByteFrequencyData(this.spectrum);

    let sum = 0;
    for (const value of this.samples) sum += ((value - 128) / 128) ** 2;
    this.rms = Math.sqrt(sum / this.samples.length);
    const low = bandEnergy(analyser, this.spectrum, LIP_SYNC.bandsHz.low);
    const high = bandEnergy(analyser, this.spectrum, LIP_SYNC.bandsHz.high);
    this.highShare = high / Math.max(1e-12, low + high);
  }
}

/** Total power in a frequency band (the analyser gives decibels scaled to 0–255). */
function bandEnergy(analyser: AnalyserNode, spectrum: Uint8Array, [from, to]: readonly number[]): number {
  const binHz = analyser.context.sampleRate / analyser.fftSize;
  const range = analyser.maxDecibels - analyser.minDecibels;
  let total = 0;
  for (let bin = Math.round(from / binHz); bin <= Math.round(to / binHz); bin++) {
    total += 10 ** ((analyser.minDecibels + (spectrum[bin] / 255) * range) / 10);
  }
  return total;
}

export function useLipSync(): LipSync {
  const [lipSync] = useState(() => new LipSync());
  return lipSync;
}
