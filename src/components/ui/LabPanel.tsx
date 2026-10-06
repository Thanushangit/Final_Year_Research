"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { DataSource } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import type { PanelId } from "@/types";
import { SampleDataBadge } from "./SampleDataBadge";

interface LabPanelProps {
  id: PanelId;
  title: string;
  model: string;
  intro: string;
  /** Where this panel's numbers came from; shows the "Sample data" badge for mock data. */
  source?: DataSource;
  children: ReactNode;
}

const AREA: Record<PanelId, string> = {
  indicbert: "[grid-area:bert]",
  vits: "[grid-area:vits]",
};

/** The white "lab" either side of the robot: a title, a short intro and a scrolling list of steps. */
export function LabPanel({ id, title, model, intro, source, children }: LabPanelProps) {
  return (
    <motion.section
      aria-labelledby={`${id}-title`}
      data-anchor={id}
      initial={{ opacity: 0, x: id === "indicbert" ? -28 : 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cn("surface-light flex min-h-0 flex-col overflow-hidden rounded-lg", AREA[id])}
    >
      <header className="flex items-start justify-between gap-3 border-b border-mist px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-display text-xl leading-tight font-semibold">
            {title} <span className="font-normal text-slate">· {model}</span>
          </h2>
          <p className="mt-0.5 text-sm text-slate">{intro}</p>
        </div>
        {source === "mock" && <SampleDataBadge tone="light" className="mt-1" />}
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </motion.section>
  );
}
