import { SegmentedControl } from "@/components/segmented-control"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit } from "@/lib/gpx/models"

export type { DistanceUnit }

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
    <SegmentedControl
      label="Distance units"
      options={[
        { value: Unit.Miles, label: "Miles", display: compact ? Unit.Miles : undefined },
        { value: Unit.Kilometers, label: "Kilometers", display: compact ? Unit.Kilometers : undefined },
      ]}
      value={value}
      onChange={onChange}
      className={className}
      optionClassName={compact ? "min-w-11 px-3" : undefined}
    />
  )
}

export { UnitToggle }
