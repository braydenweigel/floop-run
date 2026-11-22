import { Unit } from "./models"
import type { DistanceUnit, GPX } from "./models"
import { interpolate, percentile, smooth } from "./profile"
import { unitMeters } from "./split"

export type RouteMetric = "pace" | "heartRate" | "elevation"

export interface RouteColoring {
  t: (number | null)[] // per track point, 0–1 between `from` and `to`. null where unknown
  from: number // the value at t = 0, in display units (pace in ms per unit)
  to: number // the value at t = 1
}

/**
 * Scales a metric at every track point to 0–1. Heart rate and elevation go from their lowest
 * value (0) to their highest (1); pace goes from the slowest (0) to the fastest (1).
 * Returns null when the activity has no data for the metric.
 */
export function routeColoring(gpx: GPX, metric: RouteMetric, units: DistanceUnit): RouteColoring | null {
  const values = metricValues(gpx, metric, units)
  const known = values.filter((v): v is number => v !== null)
  if (known.length === 0) return null

  // pace spikes at stops and GPS glitches, so its ends are the 3rd and 97th percentiles
  // (the chart's pace range). elevation and heart rate use their true lowest and highest.
  // pace is time per distance, so its highest value is the slowest
  const [from, to] =
    metric === "pace"
      ? [percentile(known, 0.97), percentile(known, 0.03)]
      : [Math.min(...known), Math.max(...known)]
  const span = to - from

  const t = values.map((v) =>
    v === null ? null : span !== 0 ? Math.min(1, Math.max(0, (v - from) / span)) : 0.5,
  )
  return { t, from, to }
}

function metricValues(gpx: GPX, metric: RouteMetric, units: DistanceUnit): (number | null)[] {
  const points = gpx.track.segment.trackPoints

  if (metric === "elevation") {
    const metersPerElev = units === Unit.Miles ? unitMeters(Unit.Feet) : 1
    return smooth(points.map((p) => p.elevation / metersPerElev), 5)
  }

  if (metric === "heartRate") {
    const hr = points.filter((p) => p.heartRate !== null)
    if (hr.length === 0) return points.map(() => null)
    // fill gaps from the nearest readings so the line has no holes
    const hrDist = hr.map((p) => p.distance)
    const hrValue = hr.map((p) => p.heartRate!)
    return smooth(points.map((p) => interpolate(hrDist, hrValue, p.distance)), 5)
  }

  // pace over a short rolling window centered on each point (same window as the chart)
  const totalMeters = gpx.track.distance
  if (totalMeters <= 0) return points.map(() => null)
  const metersPerUnit = unitMeters(units)
  const window = Math.min(400, Math.max(50, totalMeters / 50))
  const dist = points.map((p) => p.distance)
  const time = points.map((p) => p.duration)
  return points.map((p) => {
    const from = Math.max(0, p.distance - window / 2)
    const to = Math.min(totalMeters, p.distance + window / 2)
    const ms = interpolate(dist, time, to) - interpolate(dist, time, from)
    const covered = (to - from) / metersPerUnit
    return covered > 0 && ms > 0 ? ms / covered : null
  })
}
