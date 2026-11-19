import type { DistanceUnit } from "@/lib/gpx/models"
import { Unit } from "@/lib/gpx/models"
import { unitMeters } from "@/lib/gpx/split"

/** A display value split into the number and its unit, e.g. { value: "6.47", unit: "mi" }. */
export interface Measure {
  value: string
  unit?: string
}

/** ms -> "55:29" or "1:05:29" */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

export function formatDistance(meters: number, units: DistanceUnit): Measure {
  return { value: (meters / unitMeters(units)).toFixed(2), unit: units }
}

/** Average pace as time per mile or kilometer. */
export function formatPace(ms: number, meters: number, units: DistanceUnit): Measure {
  const distance = meters / unitMeters(units)
  if (distance <= 0 || ms <= 0) return { value: "—" }
  return { value: formatDuration(ms / distance), unit: `/${units}` }
}

/** Elevation in feet alongside miles, meters alongside kilometers. Always signed. */
export function formatElevation(meters: number, units: DistanceUnit): Measure {
  const imperial = units === Unit.Miles
  const n = Math.round(imperial ? meters / unitMeters(Unit.Feet) : meters)
  const sign = n > 0 ? "+" : n < 0 ? "−" : ""
  return { value: `${sign}${Math.abs(n).toLocaleString()}`, unit: imperial ? "ft" : "m" }
}

export function formatHeartRate(bpm: number | null): Measure {
  return bpm === null ? { value: "—" } : { value: String(bpm), unit: "bpm" }
}

/** "7:12 AM" -> { value: "7:12", unit: "AM" } (no unit in 24-hour locales) */
export function formatClockTime(date: Date): Measure {
  const parts = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).formatToParts(date)
  const period = parts.find((p) => p.type === "dayPeriod")?.value
  const value = parts
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim()
  return { value, unit: period }
}

/** "Saturday, November 14, 2026" */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** "running" -> "Running" */
export function formatActivityType(type: string): string {
  return type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ") : ""
}
