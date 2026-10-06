"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StepStatus = "pending" | "waiting" | "active" | "done";

export interface StepMeta {
  title: string;
  /** One line in plain English. */
  summary: string;
  /** A longer note behind the "What the model does" button. */
  detail?: string;
}

interface StepCardProps extends StepMeta {
  number: number;
  status: StepStatus;
  /** Marks the step for the packet animation to find. */
  anchor?: string;
  /** Small text at the right of the title once the step is open, such as the time the model took. */
  aside?: ReactNode;
  children?: ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function scrollToStep(element: HTMLElement | null, reduceMotion: boolean | null) {
  element?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
}

/** The expandable "What the model does" note under a step. */
function ModelNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? noteId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-navy underline-offset-4 hover:underline"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className={cn("size-3 transition-transform duration-200", open && "rotate-90")}>
          <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        What the model does
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={noteId}
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="mt-2 border-l-2 border-navy/25 pl-3 text-sm leading-relaxed text-navy">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One numbered step in a lab panel. Pending steps show only their title; revealed ones open up. */
export function StepCard({ number, title, summary, detail, status, anchor, aside, children }: StepCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const reduceMotion = useReducedMotion();
  const open = status === "active" || status === "done";

  // Bring the step being explained into view (and again once it has finished opening, below).
  useEffect(() => {
    if (status === "active" || status === "waiting") scrollToStep(ref.current, reduceMotion);
  }, [status, reduceMotion]);

  return (
    <li
      ref={ref}
      data-anchor={anchor}
      aria-current={status === "active" ? "step" : undefined}
      className={cn(
        // Scroll margins keep the step clear of the pinned robot (top) and the presenter bar (bottom).
        "relative scroll-mt-[calc(var(--header-h)+var(--sticky-robot-h)+1.5rem)] scroll-mb-[calc(var(--controls-h)+1rem)] border-b border-mist py-3 pr-4 pl-12 xl:scroll-mt-3 xl:scroll-mb-3",
        status === "active" && "bg-gold-soft/60",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", status === "active" && "bg-gold")} />
      <span
        className={cn(
          "absolute top-3 left-5 text-sm tabular-nums",
          status === "pending" || status === "waiting" ? "text-slate" : "font-semibold text-navy",
        )}
      >
        {number}
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn("leading-snug font-medium", status === "pending" ? "text-slate" : "text-navy")}>{title}</h3>
        {open && aside && <span className="shrink-0 text-xs text-slate tabular-nums">{aside}</span>}
      </div>
      {status === "waiting" && (
        <p role="status" className="mt-1 animate-pulse text-sm text-slate">
          The model is working…
        </p>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onAnimationComplete={() => {
              if (status === "active") scrollToStep(ref.current, reduceMotion);
            }}
            // The extra margin keeps focus rings near the edges from being cut off while the body animates.
            className="-mx-1.5 overflow-hidden px-1.5 pb-1.5"
          >
            <p className="mt-1 text-sm text-slate">{summary}</p>
            {children && <div className="mt-3 pb-1">{children}</div>}
            {detail && <ModelNote text={detail} />}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Works out a step's status from the panel's current step and the step that is waiting for data. */
export function stepStatus(index: number, current: number, waitingIndex: number | null): StepStatus {
  if (index === waitingIndex) return "waiting";
  if (index < current) return "done";
  if (index === current) return "active";
  return "pending";
}
