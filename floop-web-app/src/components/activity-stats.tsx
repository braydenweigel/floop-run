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

  // short labels fit the compact 4-column grid on smaller screens
  const stats: { label: string; short: string; measure: Measure }[] = [
    { label: "Start time", short: "Start", measure: formatClockTime(activityStart(gpx)) },
    { label: "Duration", short: "Duration", measure: { value: formatDuration(track.activityTime) } },
    { label: "Distance", short: "Distance", measure: formatDistance(track.distance, units) },
    { label: "Avg pace", short: "Avg pace", measure: formatPace(track.activityTime, track.distance, units) },
    { label: "Elevation gain", short: "Elev gain", measure: formatElevation(track.elevationGain, units) },
    { label: "Net elevation", short: "Net elev", measure: formatElevation(track.netElev, units) },
    { label: "Avg heart rate", short: "Avg HR", measure: formatHeartRate(track.heartRate) },
  ]

  return (
    <dl
      className={cn(
        // compact 4-column card below lg; one row of divided cells from lg up
        "grid grid-cols-4 gap-x-3 gap-y-3 overflow-hidden rounded-xl border bg-card px-3.5 py-3",
        "lg:grid-cols-7 lg:gap-0 lg:p-0",
        className,
      )}
    >
      {stats.map(({ label, short, measure }) => (
        <div
          key={label}
          className={cn(
            "flex min-w-0 flex-col",
            // each cell draws its right divider. the card clips the last one
            "lg:gap-1 lg:px-4 lg:py-3 lg:shadow-[1px_0_0_0_var(--color-border)]",
          )}
        >
          <dt className="truncate text-[13px] text-muted-foreground">
            <span className="lg:hidden">{short}</span>
            <span className="hidden lg:inline">{label}</span>
          </dt>
          <dd className="flex flex-wrap items-baseline gap-x-0.5 lg:gap-x-1">
            <span className="text-lg leading-tight font-semibold tracking-[-0.01em] tabular-nums lg:text-xl">
              {measure.value}
            </span>
            {measure.unit && (
              <span className="text-xs text-muted-foreground lg:text-sm">{measure.unit}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export { ActivityStats }
