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
  /** The element id, so the step overview above the cards can bring this card into view. */
  id?: string;
  /** Draws the arrow to the next step; false on the last card. */
  arrow?: boolean;
  /** Small text at the right of the title once the step is open, such as the time the model took. */
  aside?: ReactNode;
  children?: ReactNode;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Slides the row of step cards sideways so this card sits in the middle. Never scrolls anything else,
 * and does nothing while the process screen is closed (it is then off screen and inert).
 */
export function scrollToStep(element: HTMLElement | null, reduceMotion: boolean | null) {
  const list = element?.parentElement;
  if (!element || !list || element.closest("[inert]")) return;
  const left = element.offsetLeft - (list.clientWidth - element.offsetWidth) / 2;
  list.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
}

/** The arrow from this card to the next one: grey ahead, gold (with dashes moving along it) once reached. */
function StepArrow({ reached }: { reached: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 56 16" className="absolute top-7 left-full h-4 w-14" fill="none">
      <path
        d="M4 8 H46"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn(reached ? "flow-dashes stroke-gold" : "stroke-mist")}
      />
      <path d="M42 3 L50 8 L42 13" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={reached ? "stroke-gold" : "stroke-mist"} />
    </svg>
  );
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

/**
 * One numbered step, as a card in a row of cards joined by arrows. Pending steps show only their
 * title; revealed ones open up. A tall card scrolls inside itself.
 */
export function StepCard({ number, title, summary, detail, status, id, arrow = true, aside, children }: StepCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const reduceMotion = useReducedMotion();
  const open = status === "active" || status === "done";

  // Bring the step being explained to the middle (and again once it has finished opening, below).
  useEffect(() => {
    if (status === "active" || status === "waiting") scrollToStep(ref.current, reduceMotion);
  }, [status, reduceMotion]);

  return (
    <li
      ref={ref}
      id={id}
      aria-current={status === "active" ? "step" : undefined}
      className="relative flex max-h-full w-[min(36rem,calc(100vw-5rem))] shrink-0"
    >
      {arrow && <StepArrow reached={status === "done"} />}
      <div
        className={cn(
          "scroll-thin relative min-h-0 w-full overflow-y-auto rounded-lg border bg-panel py-3 pr-4 pl-12 transition-[border-color,box-shadow,opacity] duration-300",
          status === "active" && "border-gold bg-gold-soft/40 shadow-[0_0_0_3px_rgba(201,162,39,0.25)]",
          status === "done" && "border-mist",
          (status === "pending" || status === "waiting") && "border-mist opacity-75",
        )}
      >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1 rounded-l-lg", status === "active" && "bg-gold")} />
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
      </div>
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
