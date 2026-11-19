import { cn } from "cn"

import { Unit } from "@/lib/gpx/models"

export type DistanceUnit = typeof Unit.Miles | typeof Unit.Kilometers

const OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: Unit.Miles, label: "Miles" },
  { value: Unit.Kilometers, label: "Kilometers" },
]

/** Segmented control for choosing miles or kilometers. */
function UnitToggle({
  value,
  onChange,
  className,
}: {
  value: DistanceUnit
  onChange: (unit: DistanceUnit) => void
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
            onClick={() => onChange(option.value)}
            className={cn(
              "h-full rounded-md px-2.5 text-sm transition-colors",
              selected
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { UnitToggle }
