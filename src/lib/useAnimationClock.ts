"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ClockOptions {
  /** Presenter speed: 2 runs the clock twice as fast. Changing it mid-way does not restart the animation. */
  speed?: number;
  /** Change this value to start the animation again from the beginning. */
  runKey?: number;
}

/**
 * Time in milliseconds (measured at 1× speed) since an animation started, updated every frame
 * and stopping at `durationMs`. With reduced motion it is at the end straight away.
 */
export function useAnimationClock(durationMs: number, { speed = 1, runKey = 0 }: ClockOptions = {}): number {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let last: number | null = null;
    let time = 0;
    const tick = (now: number) => {
      time = Math.min(durationMs, time + (last === null ? 0 : (now - last) * speedRef.current));
      last = now;
      setElapsed(time);
      if (time < durationMs) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, runKey, reduceMotion]);

  return reduceMotion ? durationMs : elapsed;
}

/** Smooth start and end, for numbers that move between two values. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
