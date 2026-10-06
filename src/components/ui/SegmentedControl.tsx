import { useId } from "react";
import { cn } from "@/lib/cn";

interface Option<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  hideLabel?: boolean;
  options: ReadonlyArray<Option<T>>;
  value: T | null;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  error?: string | null;
  className?: string;
}

/** A row of buttons where exactly one is chosen. Built on native radio inputs, so arrow keys work. */
export function SegmentedControl<T extends string | number>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  size = "md",
  error,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={`${id}-label`} className={cn("text-sm text-haze", hideLabel && "sr-only")}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("inline-flex w-fit rounded-md border p-0.5", error ? "border-alert" : "border-line")}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label key={String(option.value)} className="relative">
              <input
                type="radio"
                name={id}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block cursor-pointer rounded-[5px] tabular-nums transition-colors select-none",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                  size === "sm" ? "px-2.5 py-1 text-sm" : "px-4 py-2",
                  checked ? "bg-gold font-semibold text-ink" : "text-chalk hover:bg-ink-raised",
                )}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
