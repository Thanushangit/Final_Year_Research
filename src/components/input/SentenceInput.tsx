"use client";

import { MAX_TEXT_LENGTH } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { usePipelineStore } from "@/store/pipelineStore";

/** The sentence box, styled as the sheet of paper the robot will read. Enter submits. */
export function SentenceInput({ onSubmit }: { onSubmit: () => void }) {
  const input = usePipelineStore((s) => s.input);
  const setInput = usePipelineStore((s) => s.setInput);
  const error = usePipelineStore((s) => s.textError);
  const length = input.trim().length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="sentence" className="font-display text-lg font-medium">
          Sentence in Sri Lankan Tamil
        </label>
        <span className={cn("text-sm tabular-nums", length > MAX_TEXT_LENGTH ? "text-alert" : "text-haze")}>
          {length} / {MAX_TEXT_LENGTH}
        </span>
      </div>
      <textarea
        id="sentence"
        lang="ta"
        rows={3}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          // Enter reads aloud; Shift + Enter adds a line. Never submit halfway through IME typing.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="இங்கே ஒரு வாக்கியத்தை எழுதுங்கள்"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "sentence-error" : "sentence-hint"}
        className={cn(
          "w-full resize-y rounded-md border-l-4 bg-paper px-5 py-4 text-2xl leading-relaxed text-navy placeholder:text-slate",
          error ? "border-l-emotion-anger" : "border-l-gold",
        )}
      />
      {error ? (
        <p id="sentence-error" role="alert" className="text-sm text-alert">
          {error}
        </p>
      ) : (
        <p id="sentence-hint" className="text-sm text-haze">
          Press Enter to read aloud. Shift + Enter starts a new line.
        </p>
      )}
    </div>
  );
}
