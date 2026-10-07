"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { EMOTIONS, type EmotionVector } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { EMOTION_BG } from "@/lib/emotions";
import { usePipelineStore } from "@/store/pipelineStore";
import { PACKET_MS, ROBOT_INTRO_MS, SLIDE_MS } from "./timing";

interface Point {
  x: number;
  y: number;
}

interface Geometry {
  /** IndicBERT button to VITS button (the five emotion values). */
  trip1: string;
  /** VITS button up into the robot's chest (the voice). */
  trip2: string;
  label1: Point;
  label2: Point;
  /** Room for the "5 emotion values" label between the buttons (not on narrow phones). */
  roomForLabel: boolean;
}

const EASE = [0.65, 0, 0.35, 1] as const;

/** Finds the two process buttons and the robot, and works out the flow lines between them. */
function measure(container: HTMLElement): Geometry | null {
  const box = container.getBoundingClientRect();
  const rect = (anchor: string) => {
    const r = container.querySelector(`[data-anchor="${anchor}"]`)?.getBoundingClientRect();
    return r ? { left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top } : null;
  };
  const bert = rect("bert-button");
  const vits = rect("vits-button");
  const robot = rect("robot");
  if (!bert || !vits || !robot) return null;

  const y = ((bert.top + bert.bottom) / 2 + (vits.top + vits.bottom) / 2) / 2;
  const trip1 = `M ${bert.right + 6} ${y} H ${vits.left - 8}`;
  // From the top of the VITS button, a curve up and across into the robot's chest.
  const start = { x: vits.left + (vits.right - vits.left) * 0.35, y: vits.top - 6 };
  const chest = { x: (robot.left + robot.right) / 2 + 26, y: robot.top + (robot.bottom - robot.top) * 0.56 };
  const trip2 = `M ${start.x} ${start.y} C ${start.x} ${(start.y + chest.y) / 2}, ${chest.x + (start.x - chest.x) * 0.45} ${chest.y}, ${chest.x} ${chest.y}`;
  return {
    trip1,
    trip2,
    label1: { x: (bert.right + vits.left) / 2, y: y - 14 },
    label2: { x: chest.x + (start.x - chest.x) * 0.62, y: chest.y + (start.y - chest.y) * 0.42 },
    roomForLabel: vits.left - bert.right > 160,
  };
}

function Packet({ path, duration, delay, onDone, fadeOnArrival = false, children }: {
  path: string;
  duration: number;
  /** Seconds to wait first (the process screen is still sliding away). */
  delay: number;
  onDone?: () => void;
  /** The voice packet melts into the robot's chest light instead of staying on top of the robot. */
  fadeOnArrival?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const seconds = duration / 1000;
  return (
    <motion.div
      className="absolute top-0 left-0 flex h-8 items-center justify-center rounded-full border border-gold bg-ink px-2.5 shadow-[0_0_16px_4px_rgba(201,162,39,0.45)]"
      style={{ offsetPath: `path("${path}")`, offsetRotate: "0deg" }}
      // With reduced motion the packet simply appears at its destination and fades.
      initial={{ offsetDistance: reduceMotion ? "100%" : "0%", opacity: 0 }}
      animate={reduceMotion ? { opacity: [0, 1, 0] } : { offsetDistance: "100%", opacity: fadeOnArrival ? [0, 1, 1, 0] : 1 }}
      transition={
        reduceMotion
          ? { duration: 0.6, delay }
          : {
              duration: seconds,
              delay,
              ease: EASE,
              opacity: fadeOnArrival ? { duration: seconds + 0.3, delay, times: [0, 0.15, 0.75, 1] } : { duration: 0.2, delay },
            }
      }
      onAnimationComplete={onDone}
    >
      {children}
    </motion.div>
  );
}

function EmotionBars({ vector }: { vector: EmotionVector }) {
  return (
    <span className="flex h-4 items-end gap-[3px]">
      {EMOTIONS.map((emotion) => (
        <span key={emotion} className={cn("w-1 rounded-[1px]", EMOTION_BG[emotion])} style={{ height: `${Math.max(14, vector[emotion] * 100)}%` }} />
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

/** A flow line: shown (gold, moving dashes) only while a signal travels along it, then it fades away. */
function FlowLine({ d, shown, arrowId }: { d: string; shown: boolean; arrowId: string }) {
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      markerEnd={`url(#${arrowId})`}
      className={cn("flow-dashes stroke-gold transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")}
    />
  );
}

/**
 * On the robot screen: the gold packets that travel IndicBERT → VITS → Robot (the five emotion values,
 * then the voice), each with its flow line and label shown only while it travels.
 */
export function SignalPath({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const stage = usePipelineStore((s) => s.stage);
  const onRobot = usePipelineStore((s) => s.view === "robot");
  const runId = usePipelineStore((s) => s.runId);
  const speakRequest = usePipelineStore((s) => s.speakRequest);
  const speed = usePipelineStore((s) => s.speed);
  const vector = usePipelineStore((s) => s.emotion?.probabilities);
  const arriveAtVits = usePipelineStore((s) => s.arriveAtVits);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  // The speak request whose voice packet has reached the robot (then the VITS → robot line hides).
  const [voiceArrived, setVoiceArrived] = useState(-1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Watch the robot frame and the buttons themselves too: the frame grows from its input-screen size
    // after this mounts, which doesn't change the container's own size.
    const update = () => setGeometry(measure(container));
    const observer = new ResizeObserver(update);
    observer.observe(container);
    for (const anchor of ["robot", "bert-button", "vits-button"]) {
      const element = container.querySelector(`[data-anchor="${anchor}"]`);
      if (element) observer.observe(element);
    }
    const frame = requestAnimationFrame(update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [containerRef]);

  if (!geometry) return null;
  // Each line shows only while its packet is travelling.
  const emotionsTravelling = stage === "handoff" && onRobot;
  const voiceTravelling = stage === "playing" && onRobot && voiceArrived !== speakRequest;
  const slideBack = SLIDE_MS / 1000;
  const id = "flow-arrow";
  const label = "absolute rounded bg-ink/80 px-1.5 text-xs whitespace-nowrap text-haze transition-opacity duration-300";

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L8 5 L1 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="var(--color-gold)" />
          </marker>
        </defs>
        <FlowLine d={geometry.trip1} shown={emotionsTravelling} arrowId={id} />
        <FlowLine d={geometry.trip2} shown={voiceTravelling} arrowId={id} />
      </svg>
      {geometry.roomForLabel && (
        <span className={cn(label, "-translate-x-1/2 -translate-y-full", emotionsTravelling ? "opacity-100" : "opacity-0")} style={{ left: geometry.label1.x, top: geometry.label1.y }}>
          5 emotion values
        </span>
      )}
      <span className={cn(label, "-translate-x-1/2 -translate-y-1/2", voiceTravelling ? "opacity-100" : "opacity-0")} style={{ left: geometry.label2.x, top: geometry.label2.y }}>
        voice
      </span>
      {stage === "handoff" && onRobot && vector && (
        <Packet key={`packet-${runId}`} path={geometry.trip1} duration={PACKET_MS / speed} delay={slideBack} onDone={arriveAtVits}>
          <EmotionBars vector={vector} />
        </Packet>
      )}
      {voiceTravelling && (
        <Packet key={`voice-${speakRequest}`} path={geometry.trip2} duration={ROBOT_INTRO_MS / speed} delay={slideBack * 0.6} onDone={() => setVoiceArrived(speakRequest)} fadeOnArrival>
          <VoiceGlyph />
        </Packet>
      )}
    </div>
  );
}
