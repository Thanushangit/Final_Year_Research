"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";
import type { Stage } from "@/types";

// three.js only runs in the browser, so the scene is loaded on the client.
const RobotScene = dynamic(() => import("@/components/robot/RobotScene"), {
  ssr: false,
  loading: () => <p className="flex h-full items-center justify-center text-sm text-haze">Setting up the reading room…</p>,
});

const STATUS: Record<Stage, string> = {
  idle: "The robot is waiting at its desk.",
  understanding: "The robot picks up the paper and reads it.",
  handoff: "The feeling travels to the speech model.",
  speaking: "The speech model is preparing the voice.",
  playing: "The robot is reading the sentence aloud.",
  done: "The robot has finished reading.",
  error: "Something went wrong. The panel shows what happened.",
};

/**
 * The robot's stage. The same elements stay mounted on both screens, so the 3D scene is never rebuilt.
 * On the stage screen it fills the whole area; the tracker and process buttons sit on top of it.
 */
export function RobotFrame({ mode }: { mode: "input" | "stage" }) {
  const stage = usePipelineStore((s) => s.stage);
  return (
    <div className={cn("min-h-0 [grid-area:robot]", mode === "stage" && "h-full")}>
      <div
        data-anchor="robot"
        role="img"
        aria-label={`3D robot at a desk. ${STATUS[stage]}`}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-ink transition-[border-color,box-shadow] duration-500",
          mode === "input" ? "h-[clamp(220px,36vh,380px)]" : "h-full",
          stage === "playing" ? "border-gold shadow-[0_0_26px_rgba(201,162,39,0.35)]" : "border-line",
        )}
      >
        <RobotScene />
        {/* On the stage screen the tracker says this (and more), so the caption is for the input screen only. */}
        {mode === "input" && (
          <p aria-hidden="true" className="pointer-events-none absolute bottom-3 left-4 text-sm text-haze">
            {STATUS[stage]}
          </p>
        )}
      </div>
    </div>
  );
}
