import { cn } from "cn"

import { formatDuration, formatElevation } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX, Split } from "@/lib/gpx/models"
import { calcSplitsDistance } from "@/lib/gpx/split"

/** Per-mile or per-kilometer splits, with a bar showing how fast each one was. */
function SplitsCard({
  gpx,
  units,
  className,
}: {
  gpx: GPX
  units: DistanceUnit
  className?: string
}) {
  const splits = wholeActivitySplits(gpx, units)
  const unitName = units === Unit.Miles ? "mile" : "km"
  const elevUnit = units === Unit.Miles ? "feet" : "meters"
  const hasHeartRate = splits.some((s) => s.heartRate !== null)

  // pace in ms per unit. a split's bar is longer the faster it was
  const paces = splits.map((s) => s.duration / s.length)
  const fastest = Math.min(...paces)
  const slowest = Math.max(...paces)
  const barWidth = (pace: number) =>
    slowest === fastest
      ? 100
      : 20 + (80 * (slowest - pace)) / (slowest - fastest)

  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card p-4", className)}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Splits</h2>
        <span className="text-xs text-muted-foreground">Per {unitName}</span>
      </div>

      {splits.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This activity is too short to split.
        </p>
      ) : (
        // the table scrolls inside the card. its header row stays pinned while scrolling
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:bg-card [&>th]:pb-2 [&>th]:font-normal [&>th]:shadow-[inset_0_-1px_0_var(--color-border)]">
                <th className="pr-4 text-left">
                  {units === Unit.Miles ? "Mile" : "Km"}
                </th>
                <th className="text-left" colSpan={2}>
                  Pace
                </th>
                <th className="pl-3 text-right">Gain</th>
                <th className="pl-3 text-right">Change</th>
                {hasHeartRate && <th className="pl-3 text-right">HR</th>}
              </tr>
            </thead>
            <tbody>
              {splits.map((split, i) => {
                const partial = i === splits.length - 1 && split.length < 0.995
                return (
                  <tr key={i} className="border-b [&>td]:py-2.5">
                    <td
                      className={cn(
                        // other columns are sized to their content (the bar column takes the rest),
                        // so they need no-wrap and padding to keep from running together
                        "pr-4 whitespace-nowrap",
                        partial ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {partial ? split.length.toFixed(2) : i + 1}
                    </td>
                    <td className="whitespace-nowrap font-semibold">
                      {formatDuration(paces[i])}
                    </td>
                    <td className="w-full pr-1 pl-3">
                      <div className="h-1.5 w-full max-w-36 min-w-16 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${barWidth(paces[i])}%` }}
                        />
                      </div>
                    </td>
                    <td className="pl-3 text-right whitespace-nowrap">
                      {formatElevation(split.elevGain, units).value}
                    </td>
                    <td className="pl-3 text-right">
                      {formatElevation(split.netElev, units).value}
                    </td>
                    {hasHeartRate && (
                      <td className="pl-3 text-right">
                        {split.heartRate ?? "—"}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-auto shrink-0 pt-3 text-xs text-muted-foreground">
        Gain and change in {elevUnit}
        {hasHeartRate && " · HR in bpm"}
      </p>
    </section>
  )
}

/** Splits of one unit each over the whole activity, plus the leftover partial split. */
function wholeActivitySplits(gpx: GPX, units: DistanceUnit): Split[] {
  try {
    const { splits } = calcSplitsDistance(gpx, {
      units,
      length: 1,
      partial: true,
    })
    // drop a leftover too short to show a meaningful pace
    return splits.filter((s) => s.length >= 0.01)
  } catch {
    return [] // e.g. an activity with no distance
  }
}

export { SplitsCard }
