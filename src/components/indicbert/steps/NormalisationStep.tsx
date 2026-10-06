"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { diffWords, type DiffChange, type DiffWord } from "@/lib/textDiff";
import { langOf } from "@/lib/tokens";

function Words({ words, tone }: { words: DiffWord[]; tone: "before" | "after" }) {
  return (
    <p lang="ta" className="text-base text-navy">
      {words.map((word, index) => (
        <span key={index}>
          {index > 0 && " "}
          <span
            className={cn(
              word.changed &&
                (tone === "before"
                  ? "text-slate line-through decoration-slate/70"
                  : "font-medium underline decoration-gold decoration-2 underline-offset-[6px]"),
            )}
          >
            {word.text}
          </span>
        </span>
      ))}
    </p>
  );
}

function ChangeChip({ change }: { change: DiffChange }) {
  const before = change.before || "(nothing)";
  const after = change.after || "(removed)";
  return (
    <li className="rounded-md border border-mist bg-panel px-2 py-0.5 text-sm text-navy">
      {/* Screen readers get one plain sentence; the chip's pieces are for the eye. */}
      <span className="sr-only">
        {change.unicodeOnly ? (
          <>
            <span lang="ta">{change.after}</span> is now in the standard Unicode form
          </>
        ) : (
          <>
            <span lang={langOf(before)}>{before}</span> becomes <span lang={langOf(after)}>{after}</span>
          </>
        )}
      </span>
      <span aria-hidden="true" className="inline-flex items-center gap-1.5">
        {change.unicodeOnly ? (
          <>
            <span lang="ta">{change.after}</span>
            <span className="text-xs text-slate">now in the standard Unicode form</span>
          </>
        ) : (
          <>
            <span lang={langOf(before)}>{before}</span>
            <svg viewBox="0 0 16 10" className="h-2.5 w-4 shrink-0 text-slate">
              <path d="M1 5h13M10 1.5 14 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span lang={langOf(after)}>{after}</span>
          </>
        )}
      </span>
    </li>
  );
}

/** Step 2: the sentence before and after clean-up, with each change listed. */
export function NormalisationStep({ before, after }: { before: string; after: string }) {
  const diff = useMemo(() => diffWords(before, after), [before, after]);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
        <dt className="text-xs text-slate">Before</dt>
        <dd>
          <Words words={diff.before} tone="before" />
        </dd>
        <dt className="text-xs text-slate">After</dt>
        <dd>
          <Words words={diff.after} tone="after" />
        </dd>
      </dl>
      {diff.changes.length > 0 ? (
        <ul aria-label="What changed" className="flex flex-wrap gap-1.5">
          {diff.changes.map((change, index) => (
            <ChangeChip key={index} change={change} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate">Nothing needed changing: the sentence was already in the standard form.</p>
      )}
      <p className="text-xs text-slate">
        Checked: Unicode form (NFC), invisible characters, numbers, short forms and spacing.
      </p>
    </div>
  );
}
