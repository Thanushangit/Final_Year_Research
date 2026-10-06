"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Prosody } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { langOf } from "@/lib/tokens";
import { frameMs, symbolName } from "./shared";

function DurationBars({ symbols, durations, msPerFrame, speed }: { symbols: string[]; durations: number[]; msPerFrame: number; speed: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...durations);
  const stagger = Math.min(0.015, 0.9 / Math.max(durations.length, 1));

  return (
    <figure>
      <figcaption className="sr-only">
        Frames per character: {durations.map((frames, i) => `${symbolName(symbols[i])} ${frames}`).join(", ")}.
      </figcaption>
      <div
        aria-hidden="true"
        className={cn("flex h-24 items-end border-b border-navy/30", durations.length < 90 && "gap-px")}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setHover(null);
        }}
      >
        {durations.map((frames, i) => (
          // The whole column is the pointer target, not only the painted bar.
          <span key={i} className="relative h-full min-w-0 flex-1" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
            <motion.span
              className={cn("absolute inset-x-0 bottom-0 rounded-t-[2px]", symbols[i] === " " ? "bg-slate/45" : "bg-navy")}
              style={{ height: `${(frames / max) * 100}%`, originY: 1, opacity: hover === null || hover === i ? 1 : 0.4 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: (i * stagger) / speed, duration: 0.3 / speed, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        ))}
      </div>
      <p className="mt-1.5 min-h-5 text-xs text-slate">
        {hover === null ? (
          <>
            <span className="mr-1 inline-block size-2 rounded-[2px] bg-navy" /> character{" "}
            <span className="mr-1 ml-2 inline-block size-2 rounded-[2px] bg-slate/45" /> space (a pause). Point at a bar.
          </>
        ) : (
          <>
            <span lang={langOf(symbols[hover])} className="text-navy">
              {symbolName(symbols[hover])}
            </span>
            : {durations[hover]} frames ({Math.round(durations[hover] * msPerFrame)} ms)
          </>
        )}
      </p>
    </figure>
  );
}

const compare = (value: number, more: string, less: string) =>
  value > 1.03 ? `${more} than normal` : value < 0.97 ? `${less} than normal` : "about normal";

function ProsodyStats({ prosody }: { prosody: Prosody }) {
  const items = [
    { label: "Pace", value: `×${prosody.speakingRate.toFixed(2)}`, note: compare(prosody.speakingRate, "faster", "slower") },
    { label: "Average pitch", value: `${prosody.meanPitchHz} Hz`, note: "how high the voice sits" },
    { label: "Pitch movement", value: `×${prosody.pitchRange.toFixed(2)}`, note: compare(prosody.pitchRange, "livelier", "flatter") },
    { label: "Loudness", value: `×${prosody.energy.toFixed(2)}`, note: compare(prosody.energy, "louder", "softer") },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-slate">{item.label}</dt>
          <dd className="text-lg leading-tight font-semibold text-navy">{item.value}</dd>
          <dd className="text-xs text-slate">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}

interface DurationStepProps {
  symbols: string[];
  durations: number[];
  sampleRate: number;
  prosody: Prosody;
  speed: number;
}

/** Step 5: frames per character, and how the feeling changed pace, pitch and loudness. */
export function DurationStep({ symbols, durations, sampleRate, prosody, speed }: DurationStepProps) {
  const msPerFrame = frameMs(sampleRate);
  const total = durations.reduce((sum, frames) => sum + frames, 0);
  return (
    <div className="space-y-3">
      <DurationBars symbols={symbols} durations={durations} msPerFrame={msPerFrame} speed={speed} />
      <p className="text-sm text-navy tabular-nums">
        {total} frames × {msPerFrame.toFixed(0)} ms = {((total * msPerFrame) / 1000).toFixed(2)} s of speech
      </p>
      <ProsodyStats prosody={prosody} />
    </div>
  );
}
