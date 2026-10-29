import { cn } from "@/lib/cn";

interface SceneLoaderProps {
  /** 0–100, or null while the amount is not known yet. */
  progress?: number | null;
  /** Fades out (and stops catching the pointer) once the room is ready. */
  hidden?: boolean;
}

/** Covers the robot's room while its models and face load, so the room never shows half built. */
export function SceneLoader({ progress = null, hidden = false }: SceneLoaderProps) {
  return (
    <div
      role="status"
      aria-hidden={hidden}
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink transition-opacity duration-500",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-[3px] border-line border-t-gold motion-reduce:animate-none"
      />
      <p className="text-sm text-haze">
        Setting up the reading room…
        {progress !== null && <span className="ml-1.5 tabular-nums">{Math.round(progress)}%</span>}
      </p>
    </div>
  );
}
