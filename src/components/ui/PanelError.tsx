"use client";

import { usePipelineStore } from "@/store/pipelineStore";
import { Button } from "./Button";

/** Error box inside a lab panel, with a way to try again. */
export function PanelError({ message }: { message: string }) {
  const retry = usePipelineStore((s) => s.retry);
  const reset = usePipelineStore((s) => s.reset);
  return (
    <div role="alert" className="mx-4 mt-4 rounded-md border border-emotion-anger/40 bg-[#fbeceb] p-4">
      <p className="font-medium text-[#8f2a23]">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondaryLight" size="sm" onClick={retry}>
          Try again
        </Button>
        <Button variant="secondaryLight" size="sm" onClick={reset}>
          Try another sentence
        </Button>
      </div>
    </div>
  );
}
