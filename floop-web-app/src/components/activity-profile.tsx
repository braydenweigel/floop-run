import { useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipContentProps } from "recharts"
import { cn } from "cn"

import { formatDuration } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX } from "@/lib/gpx/models"
import { buildProfile } from "@/lib/gpx/profile"
import type { ProfilePoint, Range } from "@/lib/gpx/profile"

type SeriesKey = "pace" | "elevation" | "heartRate"

// colors are theme tokens in index.css (validated for color blindness in light and dark)
const COLORS: Record<SeriesKey, string> = {
  pace: "var(--chart-pace)",
  elevation: "var(--chart-elevation)",
  heartRate: "var(--chart-heart-rate)",
}

/**
 * Pace, elevation and heart rate along the activity. Each series is scaled to its own range
 * (shown in the legend) so their shapes can be compared; hover shows the actual values.
 */
function ActivityProfile({
  gpx,
  units,
  className,
}: {
  gpx: GPX
  units: DistanceUnit
  className?: string
}) {
  const profile = useMemo(() => buildProfile(gpx, units), [gpx, units])
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const elevUnit = units === Unit.Miles ? "ft" : "m"
  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const series: { key: SeriesKey; label: string; range: string }[] = [
    ...(profile.pace
      ? [
          {
            key: "pace" as const,
            label: "Pace",
            range: `${formatDuration(profile.pace.min)}–${formatDuration(profile.pace.max)} /${units}`,
          },
        ]
      : []),
    {
      key: "elevation",
      label: "Elevation",
      range: `${Math.round(profile.elevation.min)}–${Math.round(profile.elevation.max)} ${elevUnit}`,
    },
    ...(profile.heartRate
      ? [
          {
            key: "heartRate" as const,
            label: "Heart rate",
            range: `${profile.heartRate.min}–${profile.heartRate.max} bpm`,
          },
        ]
      : []),
  ]

  // x ticks at 0, ¼, ½, ¾ and the end of the activity
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * profile.total)

  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card p-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-semibold">Activity profile</h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Hover to inspect a point
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.map(({ key, label, range }) => {
            const off = hidden.has(key)
            return (
              <button
                key={key}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-opacity",
                  off && "opacity-50"
                )}
              >
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: COLORS[key] }}
                />
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{range}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative mt-3 min-h-40 flex-1">
        {/* absolutely filled so the chart takes whatever height the card has */}
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={profile.points}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="distance"
                type="number"
                domain={[0, profile.total]}
                ticks={ticks}
                tickFormatter={(d: number) =>
                  d === 0 ? "0" : `${d.toFixed(1)} ${units}`
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              {/* one hidden scale per series, padded so lines don't touch the edges */}
              <YAxis
                yAxisId="elevation"
                hide
                domain={paddedDomain(profile.elevation, 0.15)}
              />
              {/* reversed so faster pace is higher */}
              <YAxis
                yAxisId="pace"
                hide
                reversed
                domain={profile.pace ? paddedDomain(profile.pace, 0.1) : [0, 1]}
              />
              <YAxis
                yAxisId="heartRate"
                hide
                domain={
                  profile.heartRate
                    ? paddedDomain(profile.heartRate, 0.1)
                    : [0, 1]
                }
              />

              <Tooltip
                content={(props) => (
                  <ProfileTooltip
                    {...props}
                    units={units}
                    elevUnit={elevUnit}
                    hidden={hidden}
                  />
                )}
                cursor={{
                  stroke: "var(--muted-foreground)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                isAnimationActive={false}
              />

              {!hidden.has("elevation") && (
                <Area
                  yAxisId="elevation"
                  dataKey="elevation"
                  type="monotone"
                  stroke={COLORS.elevation}
                  strokeWidth={1.5}
                  fill={COLORS.elevation}
                  fillOpacity={0.15}
                  baseValue="dataMin"
                  isAnimationActive={false}
                  activeDot={false}
                />
              )}
              {profile.pace && !hidden.has("pace") && (
                <Line
                  yAxisId="pace"
                  dataKey="pace"
                  type="monotone"
                  stroke={COLORS.pace}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
              {profile.heartRate && !hidden.has("heartRate") && (
                <Line
                  yAxisId="heartRate"
                  dataKey="heartRate"
                  type="monotone"
                  stroke={COLORS.heartRate}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function ProfileTooltip({
  active,
  payload,
  units,
  elevUnit,
  hidden,
}: Pick<TooltipContentProps, "active" | "payload"> & {
  units: DistanceUnit
  elevUnit: string
  hidden: Set<SeriesKey>
}) {
  const point = payload?.[0]?.payload as ProfilePoint | undefined
  if (!active || !point) return null

  const rows: { key: SeriesKey; label: string; value: string }[] = [
    {
      key: "pace",
      label: "Pace",
      value:
        point.pace === null ? "—" : `${formatDuration(point.pace)} /${units}`,
    },
    {
      key: "elevation",
      label: "Elevation",
      value: `${Math.round(point.elevation)} ${elevUnit}`,
    },
    {
      key: "heartRate",
      label: "Heart rate",
      value: point.heartRate === null ? "—" : `${point.heartRate} bpm`,
    },
  ]

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">
        {point.distance.toFixed(2)} {units}
      </div>
      {rows
        .filter(
          (r) =>
            !hidden.has(r.key) &&
            !(r.key === "heartRate" && point.heartRate === null)
        )
        .map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span
              className="size-2 rounded-sm"
              style={{ background: COLORS[r.key] }}
            />
            <span className="text-muted-foreground">{r.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">
              {r.value}
            </span>
          </div>
        ))}
    </div>
  )
}

function paddedDomain({ min, max }: Range, pad: number): [number, number] {
  const span = max - min || 1
  return [min - span * pad, max + span * pad]
}

export { ActivityProfile }
