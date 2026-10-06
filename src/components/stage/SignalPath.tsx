"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { EMOTIONS, type EmotionVector } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { EMOTION_BG } from "@/lib/emotions";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { usePipelineStore } from "@/store/pipelineStore";
import { PACKET_MS, ROBOT_INTRO_MS } from "./timing";

interface Geometry {
  /** IndicBERT to VITS (the emotion vector). */
  trip1: string;
  /** VITS up into the robot (the voice). Wide screens only. */
  trip2: string | null;
  /** The resting line drawn the whole time. */
  bus: string;
  compact: boolean;
}

const EASE = [0.65, 0, 0.35, 1] as const;

/** Finds the panels and works out the packet's routes, in the container's coordinates. */
function measure(container: HTMLElement, wide: boolean): Geometry | null {
  const box = container.getBoundingClientRect();
  const rect = (anchor: string) => {
    const element = container.querySelector(`[data-anchor="${anchor}"]`);
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { left: r.left - box.left, top: r.top - box.top, bottom: r.bottom - box.top, width: r.width, height: r.height };
  };
  const bert = rect("indicbert");
  const vits = rect("vits");
  const robot = rect("robot");
  if (!bert || !vits || !robot) return null;

  if (wide) {
    // A bracket under the three columns: IndicBERT ──┴── VITS, with the ┴ rising into the robot.
    const r = 14;
    const busY = Math.max(bert.bottom, vits.bottom, robot.bottom) + 18;
    const bx = bert.left + bert.width / 2;
    const vx = vits.left + vits.width / 2;
    const rx = robot.left + robot.width / 2;
    const trip1 = `M ${bx} ${bert.bottom} V ${busY - r} Q ${bx} ${busY} ${bx + r} ${busY} H ${vx - r} Q ${vx} ${busY} ${vx} ${busY - r} V ${vits.bottom}`;
    const trip2 = `M ${vx} ${vits.bottom} V ${busY - r} Q ${vx} ${busY} ${vx - r} ${busY} H ${rx + r} Q ${rx} ${busY} ${rx} ${busY - r} V ${robot.top + robot.height * 0.6}`;
    return { trip1, trip2, bus: `${trip1} M ${rx} ${busY} V ${robot.bottom}`, compact: false };
  }

  // Stacked panels: down the left margin, from "Send to VITS" to "Three inputs".
  const send = rect("bert-send");
  const inputs = rect("vits-inputs");
  if (!send || !inputs) return null;
  const x = Math.max(3, bert.left / 2);
  const r = Math.min(6, x);
  const y1 = send.top + send.height / 2;
  const y2 = inputs.top + inputs.height / 2;
  const trip1 = `M ${bert.left} ${y1} H ${x + r} Q ${x} ${y1} ${x} ${y1 + r} V ${y2 - r} Q ${x} ${y2} ${x + r} ${y2} H ${vits.left}`;
  return { trip1, trip2: null, bus: trip1, compact: true };
}

function Packet({ path, duration, onDone, compact, fadeOnArrival = false, children }: {
  path: string;
  duration: number;
  onDone?: () => void;
  compact: boolean;
  /** The voice packet melts into the robot's chest light instead of staying on top of the robot. */
  fadeOnArrival?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const seconds = duration / 1000;
  return (
    <motion.div
      className={cn(
        "absolute top-0 left-0 flex items-center justify-center rounded-full shadow-[0_0_16px_4px_rgba(201,162,39,0.45)]",
        compact ? "size-3 bg-gold" : "h-8 border border-gold bg-ink px-2.5",
      )}
      style={{ offsetPath: `path("${path}")`, offsetRotate: "0deg" }}
      // With reduced motion the packet simply appears at its destination and fades.
      initial={{ offsetDistance: reduceMotion ? "100%" : "0%", opacity: 0 }}
      animate={
        reduceMotion
          ? { opacity: [0, 1, 0] }
          : { offsetDistance: "100%", opacity: fadeOnArrival ? [0, 1, 1, 0] : 1 }
      }
      transition={
        reduceMotion
          ? { duration: 0.6 }
          : {
              duration: seconds,
              ease: EASE,
              opacity: fadeOnArrival ? { duration: seconds + 0.3, times: [0, 0.15, 0.75, 1] } : { duration: 0.2 },
            }
      }
      onAnimationComplete={onDone}
    >
      {!compact && children}
    </motion.div>
  );
}

function Trail({ d, duration }: { d: string; duration: number }) {
  const reduceMotion = useReducedMotion();
  const seconds = duration / 1000;
  return (
    <motion.path
      d={d}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      className="stroke-gold"
      initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 1 }}
      animate={{ pathLength: 1, opacity: 0 }}
      transition={{ pathLength: { duration: seconds, ease: EASE }, opacity: { duration: 0.6, delay: seconds } }}
    />
  );
}

function EmotionBars({ vector }: { vector: EmotionVector }) {
  return (
    <span className="flex h-4 items-end gap-[3px]">
      {EMOTIONS.map((emotion) => (
        <span
          key={emotion}
          className={cn("w-1 rounded-[1px]", EMOTION_BG[emotion])}
          style={{ height: `${Math.max(14, vector[emotion] * 100)}%` }}
        />
      ))}
    </span>
  );
}

function VoiceGlyph() {
  return (
    <span className="flex h-3.5 items-center gap-[2px]">
      {[45, 90, 60, 100, 50, 75].map((height, i) => (
        <span key={i} className="w-[2px] rounded-full bg-gold" style={{ height: `${height}%` }} />
      ))}
    </span>
  );
}

/** The gold "data packet" that carries the emotion vector to VITS and the voice up to the robot. */
export function SignalPath({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const stage = usePipelineStore((s) => s.stage);
  const runId = usePipelineStore((s) => s.runId);
  const speakRequest = usePipelineStore((s) => s.speakRequest);
  const speed = usePipelineStore((s) => s.speed);
  const vector = usePipelineStore((s) => s.emotion?.probabilities);
  const bertStep = usePipelineStore((s) => s.bertStep);
  const vitsStep = usePipelineStore((s) => s.vitsStep);
  const arriveAtVits = usePipelineStore((s) => s.arriveAtVits);
  const wide = useMediaQuery("(min-width: 1280px)");
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  // Re-measure when the layout changes size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setGeometry(measure(container, wide)));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, wide]);

  // Re-measure as steps open and close, and once the panels have finished sliding in.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const frame = requestAnimationFrame(() => setGeometry(measure(container, wide)));
    const settle = window.setTimeout(() => setGeometry(measure(container, wide)), 700);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [containerRef, wide, stage, bertStep, vitsStep]);

  if (!geometry) return null;
  const tripMs = PACKET_MS / speed;
  const voiceMs = ROBOT_INTRO_MS / speed;

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", wide ? "z-20" : "z-[5]")}>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <motion.path
          d={geometry.bus}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          className="stroke-line"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        />
        {stage === "handoff" && <Trail key={`trail-${runId}`} d={geometry.trip1} duration={tripMs} />}
        {stage === "playing" && geometry.trip2 && (
          <Trail key={`voice-trail-${speakRequest}`} d={geometry.trip2} duration={voiceMs} />
        )}
      </svg>
      {stage === "handoff" && vector && (
        <Packet key={`packet-${runId}`} path={geometry.trip1} duration={tripMs} onDone={arriveAtVits} compact={geometry.compact}>
          <EmotionBars vector={vector} />
        </Packet>
      )}
      {stage === "playing" && geometry.trip2 && (
        <Packet key={`voice-${speakRequest}`} path={geometry.trip2} duration={voiceMs} compact={false} fadeOnArrival>
          <VoiceGlyph />
        </Packet>
      )}
    </div>
  );
}
