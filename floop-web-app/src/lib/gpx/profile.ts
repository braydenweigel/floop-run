import { Unit } from "./models"
import type { DistanceUnit, GPX } from "./models"
import { unitMeters } from "./split"

/** One evenly spaced sample along the activity, in display units. */
export interface ProfilePoint {
  distance: number // in miles or km from the start
  pace: number | null // ms per mile or km, smoothed. null where it can't be measured
  elevation: number // feet with miles, meters with km
  heartRate: number | null // bpm. null where the file has no heart rate data
}

export interface Range {
  min: number
  max: number
}

export interface Profile {
  points: ProfilePoint[]
  total: number // activity distance in miles or km
  pace: Range | null // typical pace range (outliers like stops are clipped to it)
  elevation: Range
  heartRate: Range | null
}

/**
 * Samples pace, elevation and heart rate at evenly spaced distances, for charting.
 * Pace is averaged over a short rolling window so GPS jitter doesn't swamp it.
 */
export function buildProfile(gpx: GPX, units: DistanceUnit, samples = 400): Profile {
  const points = gpx.track.segment.trackPoints
  const metersPerUnit = unitMeters(units)
  const metersPerElev = units === Unit.Miles ? unitMeters(Unit.Feet) : 1
  const totalMeters = gpx.track.distance

  const dist = points.map((p) => p.distance)
  const time = points.map((p) => p.duration)
  const elev = points.map((p) => p.elevation)
  const hrPoints = points.filter((p) => p.heartRate !== null)
  const hrDist = hrPoints.map((p) => p.distance)
  const hrValue = hrPoints.map((p) => p.heartRate!)

  // pace window: ~2% of the activity, kept between 50 m and 400 m
  const window = Math.min(400, Math.max(50, totalMeters / 50))
  const count = totalMeters > 0 ? samples : 1

  const raw = Array.from({ length: count }, (_, i) => {
    const d = count === 1 ? 0 : (totalMeters * i) / (count - 1)
    const from = Math.max(0, d - window / 2)
    const to = Math.min(totalMeters, d + window / 2)
    const ms = interpolate(dist, time, to) - interpolate(dist, time, from)
    const covered = (to - from) / metersPerUnit

    return {
      distance: d / metersPerUnit,
      pace: covered > 0 && ms > 0 ? ms / covered : null,
      elevation: interpolate(dist, elev, d) / metersPerElev,
      heartRate: hrPoints.length > 0 ? interpolate(hrDist, hrValue, d) : null,
    }
  })

  // light smoothing for elevation and heart rate noise
  const elevation = smooth(raw.map((p) => p.elevation))
  const heartRate = hrPoints.length > 0 ? smooth(raw.map((p) => p.heartRate!)) : null

  const paceValues = raw.map((p) => p.pace).filter((p): p is number => p !== null)
  // clip stops and GPS glitches so they don't flatten the rest of the line
  const pace = paceValues.length > 0 ? { min: percentile(paceValues, 0.03), max: percentile(paceValues, 0.97) } : null

  const profilePoints: ProfilePoint[] = raw.map((p, i) => ({
    distance: p.distance,
    pace: p.pace === null || pace === null ? null : Math.min(pace.max, Math.max(pace.min, p.pace)),
    elevation: elevation[i],
    heartRate: heartRate ? Math.round(heartRate[i]) : null,
  }))

  return {
    points: profilePoints,
    total: totalMeters / metersPerUnit,
    pace,
    elevation: rangeOf(elevation),
    heartRate: heartRate ? rangeOf(heartRate.map(Math.round)) : null,
  }
}

/** Linear interpolation of ys at x. xs must be in increasing order. */
export function interpolate(xs: number[], ys: number[], x: number): number {
  if (xs.length === 1 || x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]

  // first index with xs[i] >= x
  let lo = 1
  let hi = xs.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid] < x) lo = mid + 1
    else hi = mid
  }
  const span = xs[lo] - xs[lo - 1]
  const t = span > 0 ? (x - xs[lo - 1]) / span : 1
  return ys[lo - 1] + t * (ys[lo] - ys[lo - 1])
}

/** Centered moving average. */
export function smooth(values: number[], radius = 2): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - radius)
    const to = Math.min(values.length, i + radius + 1)
    let sum = 0
    for (let j = from; j < to; j++) sum += values[j]
    return sum / (to - from)
  })
}

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function rangeOf(values: number[]): Range {
  return { min: Math.min(...values), max: Math.max(...values) }
}
