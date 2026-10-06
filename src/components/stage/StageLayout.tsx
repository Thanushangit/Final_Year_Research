"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import { useEffect, useRef } from "react";
import { IndicBertPanel } from "@/components/indicbert/IndicBertPanel";
import { InputForm } from "@/components/input/InputForm";
import { VitsPanel } from "@/components/vits/VitsPanel";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";
import { AppHeader } from "./AppHeader";
import { PresenterControls } from "./PresenterControls";
import { RobotFrame } from "./RobotFrame";
import { SignalPath } from "./SignalPath";
import { usePipelineDirector } from "./usePipelineDirector";

// Input screen: robot on top, form below.
const INPUT_GRID = "mx-auto max-w-3xl gap-8 px-4 pt-6 pb-16 sm:px-6 [grid-template-areas:'robot'_'form']";

// Stage screen: stacked (robot, IndicBERT, VITS) below 1280 px; three columns from 1280 px.
const STAGE_GRID = cn(
  "gap-4 px-3 pt-3 pb-[calc(var(--controls-h)+1.5rem)] sm:px-5 [grid-template-areas:'robot'_'bert'_'vits']",
  "xl:h-[calc(100dvh-var(--header-h)-var(--controls-h))] xl:grid-cols-[minmax(340px,1fr)_minmax(420px,1.15fr)_minmax(340px,1fr)]",
  "xl:grid-rows-[minmax(0,1fr)] xl:pb-10 xl:[grid-template-areas:'bert_robot_vits']",
);

/** The whole demo on one route: the input screen turns into the stage screen once a sentence is sent. */
export function StageLayout() {
  const stage = usePipelineStore((s) => s.stage);
  const loadBackend = usePipelineStore((s) => s.loadBackend);
  const mainRef = useRef<HTMLElement>(null);
  const onStage = stage !== "idle";
  usePipelineDirector();

  useEffect(() => {
    void loadBackend();
  }, [loadBackend]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main ref={mainRef} className={cn("relative grid w-full", onStage ? STAGE_GRID : INPUT_GRID)}>
          {/* Always the first child, so React keeps the same 3D canvas on both screens. */}
          <RobotFrame mode={onStage ? "stage" : "input"} />
          <AnimatePresence>{!onStage && <InputForm key="input" />}</AnimatePresence>
          {onStage && <IndicBertPanel />}
          {onStage && <VitsPanel />}
          {onStage && <SignalPath containerRef={mainRef} />}
        </main>
        {onStage && <PresenterControls />}
      </div>
    </MotionConfig>
  );
}
