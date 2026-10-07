"use client";

// The robot screen's own controls: a tracker at the top (IndicBERT → VITS → Robot, with the current part
// lit), and the two process buttons in the bottom corners. The flow line between them is SignalPath.
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { usePipelineStore } from "@/store/pipelineStore";
import type { PanelId } from "@/types";
import { flowState, type PartState } from "./flowState";

const CHIP: Record<PartState, string> = {
  pending: "border-line text-haze",
  ready: "border-gold text-chalk",
  active: "border-gold bg-gold text-ink",
  done: "border-gold/50 text-chalk",
  error: "border-alert text-alert",
};

const STATE_WORD: Record<PartState, string> = {
  pending: "not started",
  ready: "ready",
  active: "running now",
  done: "done",
  error: "problem",
};

function Tick() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none">
      <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ done }: { done: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 10" className="h-2.5 w-5 shrink-0" fill="none">
      <path d="M1 5 H15 M11 1.5 L16 5 L11 8.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={done ? "stroke-gold" : "stroke-line"} />
    </svg>
  );
}

/**
 * A model failed while the robot screen was showing (the steps run in the background): say so here, with
 * the same ways out as the process screen's error box.
 */
function ErrorActions() {
  const retry = usePipelineStore((s) => s.retry);
  const reset = usePipelineStore((s) => s.reset);
  return (
    <div className="pointer-events-auto flex gap-2">
      <Button variant="primary" size="sm" onClick={retry}>
        Try again
      </Button>
      <Button variant="secondary" size="sm" onClick={reset}>
        Try another sentence
      </Button>
    </div>
  );
}

/** IndicBERT → VITS → Robot, the part working now lit in gold, and one line saying what is happening. */
function Tracker({ parts, headline, failed }: { parts: Array<{ name: string; state: PartState }>; headline: string; failed: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex flex-col items-center gap-2 px-4 sm:top-7">
      <ol aria-label="Pipeline" className="flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-2 py-1.5 backdrop-blur-sm">
        {parts.map((part, i) => (
          <li key={part.name} className="flex items-center gap-1.5">
            <span
              aria-current={part.state === "active" || part.state === "ready" ? "step" : undefined}
              className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium sm:text-sm", CHIP[part.state])}
            >
              {part.state === "done" && <Tick />}
              {part.state === "active" && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-ink" />}
              {part.name}
              <span className="sr-only">, {STATE_WORD[part.state]}</span>
            </span>
            {i < parts.length - 1 && <Chevron done={part.state === "done"} />}
          </li>
        ))}
      </ol>
      <p
        role={failed ? "alert" : undefined}
        className={cn("max-w-xl rounded-md bg-ink/70 px-3 py-1 text-center text-sm backdrop-blur-sm", failed ? "text-alert" : "text-haze")}
      >
        {headline}
      </p>
      {failed && <ErrorActions />}
    </div>
  );
}

/** "IndicBERT Process" (bottom left) or "VITS Process" (bottom right). Pulses when it is the next to open. */
function ProcessButton({ panel, state, note }: { panel: PanelId; state: PartState; note: string }) {
  const openView = usePipelineStore((s) => s.openView);
  const left = panel === "indicbert";
  return (
    <button
      type="button"
      data-anchor={left ? "bert-button" : "vits-button"}
      onClick={() => openView(panel)}
      className={cn(
        // Phones: the two buttons share the bottom row; from 640 px they sit apart in the corners.
        "absolute bottom-5 z-20 flex w-[calc(50%-1.75rem)] items-center gap-3 rounded-xl border bg-ink/85 px-3 py-2 text-left backdrop-blur-sm transition-colors sm:bottom-7 sm:w-auto sm:max-w-[40%] sm:px-4 sm:py-3",
        left ? "left-5 sm:left-7" : "right-5 flex-row-reverse text-right sm:right-7",
        state === "ready" && "attention-pulse border-gold",
        state === "active" && "border-gold",
        state === "done" && "border-gold/50 hover:border-gold",
        state === "pending" && "border-line hover:border-haze",
        state === "error" && "border-alert",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "hidden size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold sm:flex",
          state === "pending" ? "bg-ink-raised text-haze" : state === "error" ? "bg-alert text-ink" : "bg-gold text-ink",
        )}
      >
        {state === "done" ? <Tick /> : left ? 1 : 2}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base leading-tight font-semibold text-chalk sm:text-lg">
          {left ? "IndicBERT Process" : "VITS Process"}
        </span>
        <span className={cn("block truncate text-xs sm:text-sm", state === "error" ? "text-alert" : "text-haze")}>{note}</span>
      </span>
    </button>
  );
}

export function StageFlow() {
  const flow = usePipelineStore(
    useShallow((s) => flowState({ stage: s.stage, view: s.view, bertStep: s.bertStep, vitsStep: s.vitsStep, emotion: s.emotion, tts: s.tts, error: s.error })),
  );
  const behind = usePipelineStore((s) => s.view !== "robot");
  return (
    // While a process screen covers the robot, these controls can't be reached by keyboard either.
    <div inert={behind} className="contents">
      <Tracker
        parts={[
          { name: "IndicBERT", state: flow.bert },
          { name: "VITS", state: flow.vits },
          { name: "Robot", state: flow.robot },
        ]}
        headline={flow.headline}
        failed={flow.bert === "error" || flow.vits === "error"}
      />
      <ProcessButton panel="indicbert" state={flow.bert} note={flow.bertNote} />
      <ProcessButton panel="vits" state={flow.vits} note={flow.vitsNote} />
    </div>
  );
}
