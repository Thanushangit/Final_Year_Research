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

// Below 1280 px (and on screens tall enough), the robot stays pinned under the header while the
// steps scroll beneath it. The dark backing hides the steps in the gap above and around it.
const PINNED =
  "max-xl:tall:sticky max-xl:tall:top-(--header-h) max-xl:tall:z-10 max-xl:tall:-mx-3 max-xl:tall:bg-ink max-xl:tall:px-3 max-xl:tall:py-2 sm:max-xl:tall:-mx-5 sm:max-xl:tall:px-5";

/** The robot's stage. The same elements stay mounted on both screens, so the 3D scene is never rebuilt. */
export function RobotFrame({ mode }: { mode: "input" | "stage" }) {
  const stage = usePipelineStore((s) => s.stage);
  return (
    <div className={cn("min-h-0 [grid-area:robot]", mode === "stage" && cn(PINNED, "xl:h-full"))}>
      <div
        data-anchor="robot"
        role="img"
        aria-label={`3D robot at a desk. ${STATUS[stage]}`}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-ink transition-[border-color,box-shadow] duration-500",
          mode === "input" ? "h-[clamp(220px,36vh,380px)]" : "h-(--sticky-robot-h) xl:h-full",
          stage === "playing" ? "border-gold shadow-[0_0_26px_rgba(201,162,39,0.35)]" : "border-line",
        )}
      >
        <RobotScene />
        <p aria-hidden="true" className="pointer-events-none absolute bottom-3 left-4 text-sm text-haze">
          {STATUS[stage]}
        </p>
      </div>
    </div>
  );
}
