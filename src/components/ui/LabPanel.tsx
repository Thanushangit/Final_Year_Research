"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { SLIDE_MS } from "@/components/stage/timing";
import type { DataSource } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";
import type { PanelId } from "@/types";
import { SampleDataBadge } from "./SampleDataBadge";
import { scrollToStep } from "./StepCard";

interface LabPanelProps {
  id: PanelId;
  title: string;
  model: string;
  intro: string;
  /** Where this screen's numbers came from; shows the "Sample data" badge for mock data. */
  source?: DataSource;
  /** Step titles, for the overview row. */
  steps: readonly { title: string }[];
  /** Index of the step being explained (the step count once every step is done). */
  current: number;
  /** The step cards (StepCard), shown in one row joined by arrows. */
  children: ReactNode;
}

const EASE = [0.65, 0, 0.35, 1] as const;

/** The id of a step's card, so the overview can bring it into view. */
export const stepId = (panel: PanelId, index: number) => `${panel}-step-${index + 1}`;

/** Every step at a glance, joined by arrows: done (navy), now (gold), still to come (grey). */
function StepOverview({ id, steps, current, open }: Pick<LabPanelProps, "id" | "steps" | "current"> & { open: boolean }) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the current step's pill in the middle of the row as the steps move on (only this row scrolls).
  useEffect(() => {
    const list = listRef.current;
    const pill = list?.querySelector<HTMLElement>("[aria-current='step']") ?? list?.lastElementChild;
    if (!list || !(pill instanceof HTMLElement)) return;
    const left = pill.offsetLeft - list.offsetLeft - (list.clientWidth - pill.offsetWidth) / 2;
    list.scrollTo({ left, behavior: reduceMotion || !open ? "auto" : "smooth" });
  }, [current, open, reduceMotion]);

  return (
    <nav aria-label="Steps" className="border-b border-mist px-4 py-2.5 sm:px-6">
      <ol ref={listRef} className="scroll-thin flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const done = index < current;
          const now = index === current;
          return (
            <li key={step.title} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={index > current}
                aria-current={now ? "step" : undefined}
                onClick={() => scrollToStep(document.getElementById(stepId(id, index)), reduceMotion)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs whitespace-nowrap transition-colors",
                  now && "border-gold bg-gold-soft font-semibold text-navy",
                  done && "border-mist text-navy hover:border-navy/40",
                  index > current && "border-transparent text-slate",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px] tabular-nums",
                    now ? "bg-gold text-ink" : done ? "bg-navy text-chalk" : "bg-mist text-slate",
                  )}
                >
                  {index + 1}
                </span>
                <span className={cn(!now && "hidden lg:inline")}>{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <svg aria-hidden="true" viewBox="0 0 20 10" className="h-2.5 w-5 shrink-0" fill="none">
                  <path d="M1 5 H15 M11 1.5 L16 5 L11 8.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={done ? "stroke-gold" : "stroke-mist"} />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * A model's process screen. It slides over the robot (IndicBERT from the left, VITS from the right)
 * and stays mounted while closed, so its animations and results are kept. Closed, it is inert.
 */
export function LabPanel({ id, title, model, intro, source, steps, current, children }: LabPanelProps) {
  const open = usePipelineStore((s) => s.view === id);
  const closeView = usePipelineStore((s) => s.closeView);
  const backRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();

  // On opening: focus "Back to robot" and bring the current step to the middle. Esc goes back.
  useEffect(() => {
    if (!open) return;
    backRef.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => {
      // The current step, or the last one when every step is done (it ran in the background).
      const list = listRef.current;
      const card = list?.querySelector<HTMLElement>("[aria-current='step']") ?? list?.lastElementChild;
      scrollToStep(card instanceof HTMLElement ? card : null, true);
    }, SLIDE_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeView]);

  const total = steps.length;
  return (
    <motion.section
      aria-labelledby={`${id}-title`}
      aria-hidden={!open}
      inert={!open}
      initial={false}
      animate={{ x: open ? "0%" : id === "indicbert" ? "-104%" : "104%", opacity: open ? 1 : reduceMotion ? 0 : 1 }}
      transition={{ duration: SLIDE_MS / 1000, ease: EASE }}
      className="surface-light absolute inset-3 z-30 flex flex-col overflow-hidden rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:inset-4"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-mist px-4 py-3 sm:px-6">
        <button
          ref={backRef}
          type="button"
          onClick={closeView}
          className="inline-flex items-center gap-1.5 rounded-md border border-mist px-3 py-1.5 text-sm font-medium text-navy hover:border-navy/40"
        >
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none">
            <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to robot
        </button>
        {/* On phones the title gets its own row under the button and the step count. */}
        <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
          <h2 id={`${id}-title`} className="font-display text-xl leading-tight font-semibold">
            {title} <span className="font-normal text-slate">· {model}</span>
          </h2>
          <p className="mt-0.5 text-sm text-slate">{intro}</p>
        </div>
        <p className="ml-auto text-sm text-slate tabular-nums sm:ml-0">
          {current >= total ? "All steps done" : `Step ${current + 1} of ${total}`}
        </p>
        {source === "mock" && <SampleDataBadge tone="light" />}
      </header>
      <StepOverview id={id} steps={steps} current={current} open={open} />
      {/* The cards in one row. The padding lets the first and last card sit in the middle too. */}
      <ol
        ref={listRef}
        className="scroll-thin relative flex min-h-0 flex-1 items-start gap-14 overflow-x-auto overflow-y-hidden px-[max(1.5rem,calc(50%-18rem))] py-5"
      >
        {children}
      </ol>
    </motion.section>
  );
}
