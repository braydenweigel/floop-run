import { cn } from "cn"

import { Unit } from "@/lib/gpx/models"

import type { DistanceUnit } from "@/lib/gpx/models"
export type { DistanceUnit }

const OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: Unit.Miles, label: "Miles" },
  { value: Unit.Kilometers, label: "Kilometers" },
]

/** Segmented control for choosing miles or kilometers. `compact` shows "mi" / "km". */
function UnitToggle({
  value,
  onChange,
  compact = false,
  className,
}: {
  value: DistanceUnit
  onChange: (unit: DistanceUnit) => void
  compact?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Distance units"
      className={cn("flex h-11 items-center rounded-lg bg-muted p-1 md:h-9", className)}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-full rounded-md text-sm transition-colors",
              compact ? "min-w-11 px-3" : "px-2.5",
              selected
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {compact ? option.value : option.label}
          </button>
        )
      })}
    </div>
  )
}

export { UnitToggle }
