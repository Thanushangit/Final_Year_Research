import { cn } from "@/lib/cn";

interface SampleDataBadgeProps {
  /** "dark" on the stage background, "light" on the white lab panels. */
  tone?: "dark" | "light";
  className?: string;
}

/** Honest label for numbers that come from the mock API. Hidden once the real models answer. */
export function SampleDataBadge({ tone = "dark", className }: SampleDataBadgeProps) {
  return (
    <span
      title="These values come from the built-in sample API, not from the trained models."
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "dark" ? "border border-gold/60 text-gold" : "bg-mist text-navy",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
      Sample data
      <span className="sr-only">: these values are generated for the demo, not by the trained models</span>
    </span>
  );
}
