import { Unit } from "./models";
import type { Coordinate, DistanceSplits, GPX, Split, TimeSplits, TrackPoint } from "./models";

export interface DistanceSplitOptions {
  units: Unit;
  /** Length of each split, in `units`. */
  length: number;
  /** Where the first split starts, in `units`. Defaults to the start of the activity. */
  start?: number;
  /** Number of splits. 0 (the default) means as many full splits as fit. */
  intervals?: number;
  /** Add a shorter final split for whatever is left. Only applies when `intervals` is 0. */
  partial?: boolean;
}

export interface TimeSplitOptions {
  /** Length of each split, in seconds. */
  length: number;
  /** When the first split starts, in seconds. Defaults to the start of the activity. */
  start?: number;
  /** Number of splits. 0 (the default) means as many full splits as fit. */
  intervals?: number;
  /** Add a shorter final split for whatever is left. Only applies when `intervals` is 0. */
  partial?: boolean;
}

const METERS_PER_UNIT: Record<Unit, number> = {
  [Unit.Miles]: 1609.344,
  [Unit.Kilometers]: 1000,
  [Unit.Feet]: 0.3048,
};

/** Number of meters in one `unit`. */
export function unitMeters(unit: Unit): number {
  const meters = METERS_PER_UNIT[unit];
  if (meters === undefined) {
    throw new Error(`Unsupported unit "${unit}": must be one of ${Object.values(Unit).join(", ")}`);
  }
  return meters;
}

/** Splits the activity into intervals of equal distance. */
export function calcSplitsDistance(gpx: GPX, options: DistanceSplitOptions): DistanceSplits {
  const { units, length, start = 0, intervals = 0 } = options;
  const metersPerUnit = unitMeters(units);
  const total = gpx.track.distance / metersPerUnit;
  const partial = Boolean(options.partial) && intervals === 0;

  const boundaries = splitBoundaries({
    total,
    start,
    intervals,
    length,
    partial,
    format: (n) => `${Number(n.toFixed(2))}${units}`,
  });

  return {
    units,
    start,
    length,
    partial,
    splits: buildSplits(
      gpx.track.segment.trackPoints,
      byDistance,
      boundaries.map((b) => b * metersPerUnit),
      (from, to) => (to.distance - from.distance) / metersPerUnit,
    ),
  };
}

/** Splits the activity into intervals of equal time. Each split's `length` is the meters covered. */
export function calcSplitsTime(gpx: GPX, options: TimeSplitOptions): TimeSplits {
  const { length, start = 0, intervals = 0 } = options;
  const partial = Boolean(options.partial) && intervals === 0;

  const boundaries = splitBoundaries({
    total: gpx.track.activityTime / 1000,
    start,
    intervals,
    length,
    partial,
    format: (n) => `${Number(n.toFixed(2))}s`,
  });

  return {
    start,
    length,
    partial,
    splits: buildSplits(
      gpx.track.segment.trackPoints,
      byTime,
      boundaries,
      (from, to) => to.distance - from.distance,
    ),
  };
}

/**
 * Validates the split settings and returns the split boundaries (in the same units as `total`).
 * n splits have n + 1 boundaries.
 */
function splitBoundaries(opts: {
  total: number;
  start: number;
  intervals: number;
  length: number;
  partial: boolean;
  format: (n: number) => string;
}): number[] {
  const { total, start, length, partial, format } = opts;

  if (!Number.isFinite(length) || length <= 0) {
    throw new Error(`Split length must be greater than 0, got ${length}`);
  }
  if (!Number.isInteger(opts.intervals) || opts.intervals < 0) {
    throw new Error(`Number of intervals must be a whole number, 0 or more, got ${opts.intervals}`);
  }
  if (!Number.isFinite(start) || start < 0 || start >= total) {
    throw new Error(
      `Start must be at least 0 and less than the activity length (${format(total)}), got ${start}`,
    );
  }

  const intervals = opts.intervals || Math.floor((total - start) / length);
  if (intervals === 0 && !partial) {
    throw new Error(
      `No full ${format(length)} split fits after ${format(start)} in a ${format(total)} activity`,
    );
  }
  if (start + intervals * length > total) {
    throw new Error(
      `${intervals} splits of ${format(length)} starting at ${format(start)} don't fit in a ${format(total)} activity`,
    );
  }

  const boundaries = Array.from({ length: intervals + 1 }, (_, i) => start + i * length);
  if (partial && total > boundaries[boundaries.length - 1]) {
    boundaries.push(total);
  }
  return boundaries;
}

function buildSplits(
  points: TrackPoint[],
  key: Key,
  boundaries: number[],
  splitLength: (from: Position, to: Position) => number,
): Split[] {
  const positions = boundaries.map((b) => positionAt(points, key, b));

  return positions.slice(1).map((to, i) => {
    const from = positions[i];
    const isLast = i === positions.length - 2;
    return {
      length: splitLength(from, to),
      duration: to.duration - from.duration,
      startPoint: from.coord,
      endPoint: to.coord,
      elevGain: to.elevGain - from.elevGain,
      netElev: to.elevation - from.elevation,
      heartRate: avgHeartRate(points, key, boundaries[i], boundaries[i + 1], isLast),
    };
  });
}

/** Measures a track point along the activity: meters or seconds from the start. */
type Key = (p: TrackPoint) => number;
export const byDistance: Key = (p) => p.distance;
export const byTime: Key = (p) => p.duration / 1000;

/**
 * Index of the track segment (points[i] -> points[i + 1]) where `value` falls.
 * Keys only increase along the track, so this is a binary search.
 */
function segmentIndex(points: TrackPoint[], key: Key, value: number): number {
  // first point after the start with key >= value
  let lo = 1;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(points[mid]) < value) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

/**
 * Time-weighted average heart rate between `from` and `to` (measured along `key`), or null if
 * there's no heart rate data in that range. Heart rate changes linearly over time between two
 * points; if only one of them has a reading, it's used for the whole segment.
 * `includeEnd` counts time spent stopped exactly at `to` (only the final split should).
 */
export function avgHeartRate(
  points: TrackPoint[],
  key: Key,
  from: number,
  to: number,
  includeEnd: boolean,
): number | null {
  let weightedSum = 0; // heart rate × seconds
  let totalSeconds = 0; // seconds with heart rate data

  for (let i = segmentIndex(points, key, from); i < points.length - 1 && key(points[i]) <= to; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.heartRate === null && b.heartRate === null) continue;

    // portion of the segment (0 = a, 1 = b) inside the split
    const ka = key(a);
    const span = key(b) - ka;
    let t0 = 0;
    let t1 = 1;
    if (span > 0) {
      t0 = Math.max(0, (from - ka) / span);
      t1 = Math.min(1, (to - ka) / span);
      if (t1 <= t0) continue;
    } else if (ka < from || ka > to || (ka === to && !includeEnd)) {
      // stopped (no distance covered): the time counts toward the split containing this spot
      continue;
    }

    const seconds = ((t1 - t0) * (b.duration - a.duration)) / 1000;
    if (seconds <= 0) continue;

    const hrA = a.heartRate ?? b.heartRate!;
    const hrB = b.heartRate ?? a.heartRate!;
    const hr = hrA + ((t0 + t1) / 2) * (hrB - hrA);

    weightedSum += hr * seconds;
    totalSeconds += seconds;
  }

  return totalSeconds > 0 ? Math.round(weightedSum / totalSeconds) : null;
}

/** The interpolated state of the activity at a given distance or time. */
interface Position {
  coord: Coordinate;
  distance: number; // meters from the start
  duration: number; // ms from the start
  elevGain: number; // elevation gain from the start
  elevation: number;
}

/**
 * Linearly interpolates between the two track points on either side of `value`.
 * Values past either end of the track use the end point.
 */
function positionAt(points: TrackPoint[], key: Key, value: number): Position {
  const i = Math.max(0, Math.min(points.length - 2, segmentIndex(points, key, value)));
  const a = points[i];
  const b = points[i + 1] ?? a; // single-point track

  const span = key(b) - key(a);
  const t = span > 0 ? Math.max(0, Math.min(1, (value - key(a)) / span)) : 0;
  const lerp = (x: number, y: number) => x + t * (y - x);

  return {
    coord: { lat: lerp(a.lat, b.lat), lon: lerp(a.lon, b.lon) },
    distance: lerp(a.distance, b.distance),
    duration: lerp(a.duration, b.duration),
    elevGain: lerp(a.elevGain, b.elevGain),
    elevation: lerp(a.elevation, b.elevation),
  };
}
