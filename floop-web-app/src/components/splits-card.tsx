import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { AddSplitsDialog } from "@/components/add-splits-dialog"
import type { RouteColorMode } from "@/components/route-map"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { COLORMAPS, UNKNOWN_COLOR, colormapGradient } from "@/lib/colormaps"
import {
  customSplitRows,
  defaultSplitRows,
  describeCustomSplit,
} from "@/lib/custom-splits"
import type { CustomSplitDef, SplitRow } from "@/lib/custom-splits"
import { formatDuration, formatElevation } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX } from "@/lib/gpx/models"
import { scaleToUnit } from "@/lib/gpx/route-colors"

const DEFAULT_ITEM = "default"

/**
 * The activity's splits: per mile or km, plus any custom splits the user adds, each in its own
 * accordion section. Each bar's length shows how fast the split was; its color shows the metric
 * chosen for the route map (pace, average heart rate or net elevation change).
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
  // custom splits belong to the activity they were made for, so loading another file clears them
  const [custom, setCustom] = useState<{ gpx: GPX; defs: CustomSplitDef[] }>({
    gpx,
    defs: [],
  })
  const defs = custom.gpx === gpx ? custom.defs : []
  const [openItems, setOpenItems] = useState<string[]>([DEFAULT_ITEM])

  const unitName = units === Unit.Miles ? "mile" : "km"
  const elevUnit = units === Unit.Miles ? "feet" : "meters"
  const hasHeartRate = gpx.track.heartRate !== null

  const add = (def: CustomSplitDef) => {
    setCustom({ gpx, defs: [...defs, def] })
    setOpenItems((items) => [...items, def.id])
    // bring the new section into view once it has rendered
    requestAnimationFrame(() =>
      document
        .getElementById(`splits-${def.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    )
  }
  const remove = (id: string) =>
    setCustom({ gpx, defs: defs.filter((d) => d.id !== id) })

  const defaultRows = defaultSplitRows(gpx, units)

  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card p-4", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Splits</h2>
        <AddSplitsDialog gpx={gpx} units={units} onAdd={add} />
      </div>

      {/* the sections scroll inside the card. each table's header row stays pinned while scrolling.
          -mr-3 pr-3: the scrollbar sits out in the card's padding, leaving a gap before the HR column */}
      <div className="mt-2 -mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
        <Accordion
          multiple
          value={openItems}
          onValueChange={(value) => setOpenItems(value as string[])}
        >
          <AccordionItem value={DEFAULT_ITEM}>
            <AccordionTrigger>Per {unitName}</AccordionTrigger>
            <AccordionContent>
              {defaultRows.length === 0 ? (
                <p className="text-muted-foreground">
                  This activity is too short to split.
                </p>
              ) : (
                <SplitsTable
                  rows={defaultRows}
                  firstColumn={units === Unit.Miles ? "Mile" : "Km"}
                  units={units}
                  colorBy={colorBy}
                  hasHeartRate={hasHeartRate}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {defs.map((def) => {
            const { title, detail } = describeCustomSplit(def, units)
            let rows: SplitRow[] = []
            let error: string | null = null
            try {
              rows = customSplitRows(gpx, def, units)
            } catch (err) {
              error = err instanceof Error ? err.message : String(err)
            }
            return (
              <AccordionItem
                key={def.id}
                value={def.id}
                id={`splits-${def.id}`}
              >
                <AccordionTrigger
                  actions={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${title.toLowerCase()} splits`}
                      title="Remove these splits"
                      onClick={() => remove(def.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  }
                >
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span>{title}</span>
                    {detail && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {detail}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {error ? (
                    <p className="text-destructive">{error}</p>
                  ) : (
                    <SplitsTable
                      rows={rows}
                      firstColumn="Split"
                      units={units}
                      colorBy={colorBy}
                      hasHeartRate={hasHeartRate}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      <p className="mt-auto shrink-0 pt-3 text-xs text-muted-foreground">
        Pace per {unitName} · gain and change in {elevUnit}
        {hasHeartRate && " · HR in bpm"}
      </p>
    </section>
  )
}

/** One set of splits, with a bar per split and a color legend when the bars are colored. */
function SplitsTable({
  rows,
  firstColumn,
  units,
  colorBy,
  hasHeartRate,
}: {
  rows: SplitRow[]
  firstColumn: string
  units: DistanceUnit
  colorBy: RouteColorMode
  hasHeartRate: boolean
}) {
  // a split's bar is longer the faster it was
  const known = rows.map((r) => r.pace).filter((p): p is number => p !== null)
  const fastest = Math.min(...known)
  const slowest = Math.max(...known)
  const barWidth = (pace: number | null) =>
    pace === null
      ? 0
      : slowest === fastest
        ? 100
        : 20 + (80 * (slowest - pace)) / (slowest - fastest)

  const barColors = splitColors(rows, colorBy, units)

  return (
    <>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:bg-card [&>th]:pb-2 [&>th]:font-normal [&>th]:shadow-[inset_0_-1px_0_var(--color-border)]">
            <th className="pr-4 text-left">{firstColumn}</th>
            <th className="text-left" colSpan={2}>
              Pace
            </th>
            <th className="pl-3 text-right">Gain</th>
            <th className="pl-3 text-right">Change</th>
            {hasHeartRate && <th className="pl-3 text-right">HR</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0 [&>td]:py-2.5">
              {/* other columns are sized to their content (the bar column takes the rest),
                  so they need no-wrap and padding to keep from running together */}
              <td
                className={cn(
                  "pr-4 whitespace-nowrap",
                  row.partial ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {row.label}
              </td>
              <td className="font-semibold whitespace-nowrap">
                {row.pace === null ? "—" : formatDuration(row.pace)}
              </td>
              <td className="w-full pr-1 pl-3">
                <div className="h-1.5 w-full max-w-36 min-w-16 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      // colormap ends can be near black or near white, so colored bars get
                      // a faint outline to stay visible on the card in either theme
                      barColors ? "ring-1 ring-foreground/20" : "bg-primary"
                    )}
                    style={{
                      width: `${barWidth(row.pace)}%`,
                      background: barColors?.colors[i],
                    }}
                  />
                </div>
              </td>
              <td className="pl-3 text-right whitespace-nowrap">
                {formatElevation(row.split.elevGain, units).value}
              </td>
              <td className="pl-3 text-right whitespace-nowrap">
                {formatElevation(row.split.netElev, units).value}
              </td>
              {hasHeartRate && (
                <td className="pl-3 text-right">
                  {row.split.heartRate ?? "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {barColors && (
        <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground tabular-nums">
          <span>{barColors.label}</span>
          <span>{barColors.from}</span>
          <span
            className="h-1.5 w-12 rounded-full"
            style={{
              background: colormapGradient(COLORMAPS[barColors.metric]),
            }}
          />
          <span>{barColors.to}</span>
        </div>
      )}
    </>
  )
}

/**
 * Bar colors for the chosen metric, scaled across the splits like the route map: 0 at the lowest
 * value and 1 at the highest, except pace, which goes from the slowest split to the fastest.
 * Null for a solid color.
 */
function splitColors(
  rows: SplitRow[],
  colorBy: RouteColorMode,
  units: DistanceUnit
) {
  if (colorBy === "solid" || rows.length === 0) return null

  const values: (number | null)[] = rows.map((r) =>
    colorBy === "pace"
      ? r.pace
      : colorBy === "heartRate"
        ? r.split.heartRate
        : r.split.netElev
  )
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

export { SplitsCard }
