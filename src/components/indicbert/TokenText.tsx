import { cn } from "@/lib/cn";
import type { TokenView } from "@/lib/tokens";

/** A token's text, with its "##" or "▁" marker drawn lighter in front. */
export function TokenText({ view, className }: { view: TokenView; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      {view.marker && <span className="opacity-70">{view.marker}</span>}
      <span lang={view.lang}>{view.text}</span>
    </span>
  );
}
