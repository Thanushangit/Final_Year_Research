"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { BERT_STEPS } from "@/components/indicbert/bertSteps";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { VITS_STEPS } from "@/components/vits/vitsSteps";
import { BERT_STEP_COUNT, VITS_STEP_COUNT, usePipelineStore, type PipelineStore } from "@/store/pipelineStore";
import { flowState } from "./flowState";

const MODE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "step", label: "Step" },
] as const;

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
] as const;

/** One line telling the presenter (and screen readers) where the demo is. */
function statusText(state: PipelineStore): string {
  // On the robot screen with a process waiting to be opened, say so.
  if (state.view === "robot" && (state.stage === "understanding" || state.stage === "speaking")) return flowState(state).headline;
  switch (state.stage) {
    case "understanding":
      return `Understanding, step ${state.bertStep + 1} of ${BERT_STEP_COUNT}: ${BERT_STEPS[state.bertStep].title}${
        state.emotion ? "" : " (IndicBERT is working)"
      }`;
    case "handoff":
      return "Sending the five emotion values to VITS";
    case "speaking":
      return `Speaking, step ${state.vitsStep + 1} of ${VITS_STEP_COUNT}: ${VITS_STEPS[state.vitsStep].title}${
        state.tts ? "" : " (VITS is working)"
      }`;
    case "playing":
      return "The robot is reading the sentence aloud";
    case "done":
      return "Finished. Press Replay to watch it again.";
    case "error":
      return state.error?.message ?? "Something went wrong.";
    default:
      return "";
  }
}

/** Space or → shows the next step, R replays. Ignored while typing or when a key combo is held. */
function usePresenterKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const store = usePipelineStore.getState();
      // Space on a focused button already presses that button.
      const onButton = Boolean(target?.closest("button, a"));
      if (event.key === "ArrowRight" || (event.key === " " && !onButton)) {
        event.preventDefault();
        store.requestNext();
      } else if (event.key === "r" || event.key === "R") {
        store.replay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function PresenterControls() {
  const state = usePipelineStore();
  const { stage, mode, speed, emotion, setMode, setSpeed, requestNext, replay, reset } = state;
  const canNext = stage === "understanding" || stage === "handoff" || stage === "speaking";
  usePresenterKeys();

  return (
    <motion.section
      aria-label="Presenter controls"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink"
    >
      <div className="mx-auto flex min-h-(--controls-h) max-w-[1920px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:px-6 md:justify-center md:gap-x-4 lg:justify-start">
        {/* Status line: read out by screen readers everywhere, shown on screens 1024 px and wider. */}
        <p aria-live="polite" className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1 lg:truncate lg:text-sm lg:text-haze">
          {statusText(state)}
        </p>
        {/* Wide screens follow this order; phones use the order-* classes to make two rows. */}
        <SegmentedControl
          label="Presenter mode"
          hideLabel
          size="sm"
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          className="order-1 md:order-none"
        />
        <Button
          onClick={requestNext}
          disabled={!canNext}
          variant={mode === "step" ? "primary" : "secondary"}
          className="order-4 flex-1 md:order-none md:flex-none"
        >
          Next step
        </Button>
        <SegmentedControl
          label="Speed"
          hideLabel
          size="sm"
          options={SPEED_OPTIONS}
          value={speed}
          onChange={setSpeed}
          className="order-2 ml-auto md:order-none md:ml-0"
        />
        <span aria-hidden="true" className="order-3 basis-full md:hidden" />
        <Button onClick={replay} disabled={!emotion} className="order-5 md:order-none">
          Replay
        </Button>
        <Button onClick={reset} className="hidden md:order-none md:inline-flex">
          Try another sentence
        </Button>
      </div>
    </motion.section>
  );
}
