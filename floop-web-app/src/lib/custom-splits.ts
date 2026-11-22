import { formatDuration } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX, Split } from "@/lib/gpx/models"
import { calcSplitsDistance, calcSplitsTime, unitMeters } from "@/lib/gpx/split"

export type SplitKind = "distance" | "time"

/**
 * A user-defined way to split the activity. Distances are stored in meters (so they follow the
 * miles/kilometers toggle) and times in ms.
 */
export interface CustomSplitDef {
  id: string
  kind: SplitKind
  length: number
  start: number
  intervals: number // 0: as many as fit
  partial: boolean // add a shorter final split for what's left (only when intervals is 0)
}

/** One row of a splits table, in display units. */
export interface SplitRow {
  label: string // first column: split number, or the length of a leftover partial split
  partial: boolean
  pace: number | null // ms per mile or km. null if the split covered no distance
  split: Split
}

/** Rows for the standard one-mile or one-kilometer splits, plus the leftover partial split. */
export function defaultSplitRows(gpx: GPX, units: DistanceUnit): SplitRow[] {
  try {
    const { splits } = calcSplitsDistance(gpx, {
      units,
      length: 1,
      partial: true,
    })
    return distanceRows(
      splits.filter((s) => s.length >= 0.01),
      1
    ) // drop a uselessly short leftover
  } catch {
    return [] // e.g. an activity with no distance
  }
}

/** Rows for a custom split. Throws with a readable message if it doesn't fit the activity. */
export function customSplitRows(
  gpx: GPX,
  def: CustomSplitDef,
  units: DistanceUnit
): SplitRow[] {
  const { intervals, partial } = def
  if (def.kind === "distance") {
    const metersPerUnit = unitMeters(units)
    const length = def.length / metersPerUnit
    const { splits } = calcSplitsDistance(gpx, {
      units,
      length,
      start: def.start / metersPerUnit,
      intervals,
      partial,
    })
    return distanceRows(splits, length)
  }

  const { splits } = calcSplitsTime(gpx, {
    length: def.length / 1000,
    start: def.start / 1000,
    intervals,
    partial,
  })
  const metersPerUnit = unitMeters(units)
  return splits.map((split, i) => {
    const isPartial =
      partial &&
      intervals === 0 &&
      i === splits.length - 1 &&
      split.duration < def.length - 500
    const distance = split.length / metersPerUnit // time splits' length is meters covered
    return {
      label: isPartial ? formatDuration(split.duration) : String(i + 1),
      partial: isPartial,
      pace: distance > 0 ? split.duration / distance : null,
      split,
    }
  })
}

function distanceRows(splits: Split[], length: number): SplitRow[] {
  return splits.map((split, i) => {
    const isPartial = i === splits.length - 1 && split.length < length * 0.995
    return {
      label: isPartial ? split.length.toFixed(2) : String(i + 1),
      partial: isPartial,
      pace: split.length > 0 ? split.duration / split.length : null,
      split,
    }
  })
}

/** A short name for a custom split, like "Every 2 mi from 1 mi · 5 splits". */
export function describeCustomSplit(
  def: CustomSplitDef,
  units: DistanceUnit
): { title: string; detail: string } {
  const amount = (n: number) =>
    def.kind === "distance"
      ? `${Number((n / unitMeters(units)).toFixed(2))} ${units}`
      : formatDuration(n)
  const detail = [
    def.start > 0 && `from ${amount(def.start)}`,
    def.intervals > 0 &&
      `${def.intervals} ${def.intervals === 1 ? "split" : "splits"}`,
  ]
    .filter(Boolean)
    .join(" · ")
  return { title: `Every ${amount(def.length)}`, detail }
}

// ---- form input parsing. each returns the value, or an error message for the field ----

type Parsed = { value: number } | { error: string }

/** A distance in `units`, returned in meters. */
export function parseDistance(
  text: string,
  units: DistanceUnit,
  { optional = false } = {}
): Parsed {
  const t = text.trim()
  if (t === "") return optional ? { value: 0 } : { error: "Enter a distance" }
  if (!/^\d*\.?\d+$/.test(t))
    return {
      error: `Enter a number of ${units === Unit.Miles ? "miles" : "kilometers"}, like 1.5`,
    }
  const n = Number(t)
  if (!optional && n <= 0) return { error: "Must be more than 0" }
  return { value: n * unitMeters(units) }
}

/** A time as "m:ss", "h:mm:ss" or a plain number of minutes, returned in ms. */
export function parseTime(text: string, { optional = false } = {}): Parsed {
  const t = text.trim()
  if (t === "") return optional ? { value: 0 } : { error: "Enter a time" }
  const format = { error: "Use m:ss or h:mm:ss, like 5:00" }

  let seconds: number
  if (/^\d*\.?\d+$/.test(t)) {
    seconds = Number(t) * 60 // plain number: minutes
  } else {
    const parts = t.split(":")
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return format
    const nums = parts.map(Number)
    // every part after the first is minutes or seconds, so must be under 60
    if (nums.slice(1).some((n) => n >= 60))
      return { error: "Minutes and seconds must be under 60" }
    seconds = nums.reduce((total, n) => total * 60 + n, 0)
  }
  if (!optional && seconds <= 0) return { error: "Must be more than 0" }
  return { value: seconds * 1000 }
}

/** A number of splits. Blank means as many as fit (0). */
export function parseIntervals(text: string): Parsed {
  const t = text.trim()
  if (t === "") return { value: 0 }
  if (!/^\d+$/.test(t) || Number(t) < 1)
    return { error: "Enter a whole number, 1 or more" }
  return { value: Number(t) }
}
