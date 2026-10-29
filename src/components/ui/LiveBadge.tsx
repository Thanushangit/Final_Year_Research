import { cn } from "@/lib/cn";

interface LiveBadgeProps {
  /** "dark" on the stage background, "light" on the white lab panels. */
  tone?: "dark" | "light";
  className?: string;
}

/** Shows that the numbers come from the real trained models. The dot pulses, except under reduced motion. */
export function LiveBadge({ tone = "dark", className }: LiveBadgeProps) {
  return (
    <span
      title="These values come from the trained models on the live backend."
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "dark" ? "border border-gold/60 text-chalk" : "bg-mist text-navy",
        className,
      )}
    >
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-gold" />
      </span>
      Live
      <span className="sr-only">: these values come from the trained models</span>
    </span>
  );
}
