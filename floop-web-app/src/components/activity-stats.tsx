import { cn } from "cn"

import type { DistanceUnit } from "@/lib/gpx/models"
import { activityStart } from "@/lib/activity"
import {
  formatClockTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatPace,
} from "@/lib/format"
import type { Measure } from "@/lib/format"
import type { GPX } from "@/lib/gpx/models"

/** Row of headline numbers for the activity. */
function ActivityStats({
  gpx,
  units,
  className,
}: {
  gpx: GPX
  units: DistanceUnit
  className?: string
}) {
  const { track } = gpx

  const stats: { label: string; measure: Measure }[] = [
    { label: "Start time", measure: formatClockTime(activityStart(gpx)) },
    { label: "Duration", measure: { value: formatDuration(track.activityTime) } },
    { label: "Distance", measure: formatDistance(track.distance, units) },
    { label: "Avg pace", measure: formatPace(track.activityTime, track.distance, units) },
    { label: "Elevation gain", measure: formatElevation(track.elevationGain, units) },
    { label: "Net elevation", measure: formatElevation(track.netElev, units) },
    { label: "Avg heart rate", measure: formatHeartRate(track.heartRate) },
  ]

  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-4 lg:grid-cols-7",
        className,
      )}
    >
      {stats.map(({ label, measure }) => (
        // each cell draws its right and bottom divider. the card clips the ones on its edges
        <div
          key={label}
          className="flex flex-col gap-1 px-4 py-3 shadow-[1px_0_0_0_var(--color-border),0_1px_0_0_var(--color-border)]"
        >
          <dt className="text-[13px] text-muted-foreground">{label}</dt>
          <dd className="flex items-baseline gap-1">
            <span className="text-xl font-semibold tracking-[-0.01em] tabular-nums">{measure.value}</span>
            {measure.unit && <span className="text-sm text-muted-foreground">{measure.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export { ActivityStats }
