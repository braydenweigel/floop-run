import { cn } from "cn"

import type { RouteColorMode } from "@/components/route-map"
import { COLORMAPS, UNKNOWN_COLOR, colormapGradient } from "@/lib/colormaps"
import { formatDuration, formatElevation } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX, Split } from "@/lib/gpx/models"
import { scaleToUnit } from "@/lib/gpx/route-colors"
import { calcSplitsDistance } from "@/lib/gpx/split"

/**
 * Per-mile or per-kilometer splits. Each bar's length shows how fast the split was; its color
 * shows the metric chosen for the route map (pace, average heart rate or net elevation change).
 */
function SplitsCard({
  gpx,
  units,
  colorBy,
  className,
}: {
  gpx: GPX
  units: DistanceUnit
  colorBy: RouteColorMode
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

  const barColors = splitColors(splits, paces, colorBy, units)

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
        // the table scrolls inside the card. its header row stays pinned while scrolling.
        // -mr-3 pr-3: the scrollbar sits out in the card's padding, leaving a gap before the
        // HR column while the numbers still line up with "Per mile" above
        <div className="mt-2 -mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
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
                    <td className="font-semibold whitespace-nowrap">
                      {formatDuration(paces[i])}
                    </td>
                    <td className="w-full pr-1 pl-3">
                      <div className="h-1.5 w-full max-w-36 min-w-16 rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            // colormap ends can be near black or near white, so colored bars get
                            // a faint outline to stay visible on the card in either theme
                            barColors
                              ? "ring-1 ring-foreground/20"
                              : "bg-primary"
                          )}
                          style={{
                            width: `${barWidth(paces[i])}%`,
                            background: barColors?.colors[i],
                          }}
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

      <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
        <p>
          Gain and change in {elevUnit}
          {hasHeartRate && " · HR in bpm"}
        </p>
        {barColors && (
          <p className="flex items-center gap-1.5 tabular-nums">
            <span>{barColors.label}</span>
            <span>{barColors.from}</span>
            <span
              className="h-1.5 w-12 rounded-full"
              style={{
                background: colormapGradient(COLORMAPS[barColors.metric]),
              }}
            />
            <span>{barColors.to}</span>
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * Bar colors for the chosen metric, scaled across the splits like the route map: 0 at the lowest
 * value and 1 at the highest, except pace, which goes from the slowest split to the fastest.
 * Null for a solid color.
 */
function splitColors(
  splits: Split[],
  paces: number[],
  colorBy: RouteColorMode,
  units: DistanceUnit
) {
  if (colorBy === "solid" || splits.length === 0) return null

  const values: (number | null)[] =
    colorBy === "pace"
      ? paces
      : colorBy === "heartRate"
        ? splits.map((s) => s.heartRate)
        : splits.map((s) => s.netElev)
  const known = values.filter((v): v is number => v !== null)
  if (known.length === 0) return null

  const low = Math.min(...known)
  const high = Math.max(...known)
  const [from, to] = colorBy === "pace" ? [high, low] : [low, high]
  const colormap = COLORMAPS[colorBy]
  const colors = scaleToUnit(values, from, to).map((t) =>
    t === null ? UNKNOWN_COLOR : colormap(t)
  )

  const format = (v: number) =>
    colorBy === "pace"
      ? formatDuration(v)
      : colorBy === "heartRate"
        ? String(Math.round(v))
        : formatElevation(v, units).value
  const unit =
    colorBy === "pace"
      ? `/${units}`
      : colorBy === "heartRate"
        ? "bpm"
        : formatElevation(0, units).unit
  const label =
    colorBy === "pace"
      ? "Pace"
      : colorBy === "heartRate"
        ? "Avg HR"
        : "Net elev"

  return {
    metric: colorBy,
    colors,
    from: format(from),
    to: `${format(to)} ${unit}`,
    label,
  }
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
