"use client";

import { rgbCss, scaleRgb } from "@/lib/colorScale";
import { langOf } from "@/lib/tokens";
import { useAnimationClock } from "@/lib/useAnimationClock";

const SHOWN = 16;
const CELLS = 8;
const SWEEP_MS = 1400;

/** Shades for the illustration only. The same character in the same place always looks the same. */
function illustrativeColumn(char: string, index: number): number[] {
  let seed = ((char.codePointAt(0) ?? 0) * 7919 + index * 104729) % 2147483647;
  return Array.from({ length: CELLS }, () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  });
}

/** Step 4: characters go in, one hidden vector per character comes out (shown as a sketch). */
export function TextEncoderStep({ symbols, speed }: { symbols: string[]; speed: number }) {
  const shown = symbols.slice(0, SHOWN);
  const elapsed = useAnimationClock(SWEEP_MS, { speed });
  const reached = (elapsed / SWEEP_MS) * shown.length;
  const columns = { gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` };

  return (
    <div>
      <div aria-hidden="true" className="grid gap-0.5" style={columns}>
        {shown.map((char, i) => (
          <span key={i} lang={langOf(char)} className="flex h-7 items-center justify-center rounded-sm bg-mist text-sm text-navy">
            {char === " " ? "␣" : char}
          </span>
        ))}
      </div>
      <div className="relative my-2 overflow-hidden rounded-md bg-navy px-3 py-2 text-white">
        <p className="text-sm font-medium">Text encoder</p>
        <p className="text-xs text-white/80">6 transformer layers · 2 attention heads · 192 numbers per character</p>
        <p className="mt-1 flex items-center gap-3 text-xs text-white/80">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2 rounded-[2px] bg-white" /> speaker vector
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2 rounded-[2px] bg-gold" /> emotion vector
          </span>
        </p>
        {/* A gold line runs along the block as it works through the characters. */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-[3px] bg-gold"
          style={{ width: `${Math.min(1, elapsed / SWEEP_MS) * 100}%` }}
        />
      </div>
      <div aria-hidden="true" className="grid gap-0.5" style={columns}>
        {shown.map((char, i) => (
          <span key={i} className="flex flex-col gap-px transition-opacity duration-300" style={{ opacity: i < reached ? 1 : 0 }}>
            {illustrativeColumn(char, i).map((t, k) => (
              <span key={k} className="h-1.5 rounded-[1px]" style={{ backgroundColor: rgbCss(scaleRgb("diverging", t)) }} />
            ))}
          </span>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-slate">
        {symbols.length} characters in, {symbols.length} hidden vectors out (192 numbers each).
        {symbols.length > SHOWN && ` Showing the first ${SHOWN}.`} The coloured squares are a sketch, not the
        model&apos;s numbers.
      </p>
    </div>
  );
}
