import { BarStrip } from "@/components/ui/BarStrip";
import { SignLegend } from "@/components/ui/ScaleLegend";
import { formatNumber } from "@/lib/format";

/** Step 6: the [CLS] vector after the last layer, shown as a strip of bars above and below zero. */
export function ClsVectorStep({ values, speed }: { values: number[]; speed: number }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-navy">
          <span className="rounded-md bg-gold px-1.5 py-0.5 text-xs text-ink">[CLS]</span>
          768 numbers, showing the first {values.length}
        </p>
        <SignLegend />
      </div>
      <BarStrip
        values={values}
        speed={speed}
        label="The [CLS] sentence vector"
        describe={(index, value) => (
          <>
            Number {index + 1} of 768: <span className="text-navy tabular-nums">{formatNumber(value, 3)}</span>
          </>
        )}
        hint="Point at a bar to see its number."
      />
    </div>
  );
}
