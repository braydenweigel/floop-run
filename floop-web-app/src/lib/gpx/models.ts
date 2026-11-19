export interface GPX {
  track: Track; // <trk>
  startTime: Date; // <metadata><time>
}

export interface Track {
  name: string; // <name>
  type: string; // <type>
  segment: TrackSeg; // <trkseg>

  // Calculated fields
  distance: number;
  activityTime: number; // ms
  elevationGain: number;
  netElev: number;
  heartRate: number | null; // time-weighted average heart rate. null if the activity has no heart rate data
}

export interface TrackSeg {
  trackPoints: TrackPoint[]; // <trkpt>
}

export interface TrackPoint {
  // XML fields
  lat: number; // lat attribute
  lon: number; // lon attribute
  elevation: number; // <ele>
  time: Date; // <time>
  heartRate: number | null; // <extensions><TrackPointExtension><hr>

  // Calculated fields
  distance: number;
  duration: number; // ms
  elevGain: number;
}

export interface Coordinate {
  lat: number;
  lon: number;
}

/** A unit of distance. */
export const Unit = {
  Miles: "mi",
  Kilometers: "km",
  Feet: "ft",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export interface DistanceSplits {
  units: Unit; // the units (miles, kilometers, feet) of the split
  start: number; // the point the first split starts from. should match units used. use 0 to start at beginning of activity
  length: number; // the length of the split
  partial: boolean; // true includes partial splits at end of activity. A 4.5km activity can return Splits with Distances of 1, 1, 1, 1, and 0.5. Only matters when splitting an entire activity
  splits: Split[];
}

export interface TimeSplits {
  start: number; // the time in seconds the first split starts from. use 0 to start at beginning of activity. use 120 to start from 2 minutes
  length: number; // the length of the split in seconds
  partial: boolean; // true includes partial splits at end of activity. A 2000 second activity can return Splits with Durations of 600, 600, 600, and 200. Only matters when splitting an entire activity
  splits: Split[];
}

export interface Split {
  length: number; // length of the split. matches DistanceSplits.length except for the last Split when partial === true
  duration: number; // duration of the split, in ms
  startPoint: Coordinate; // coordinates at the beginning of the split
  endPoint: Coordinate; // coordinates at the end of the split
  elevGain: number; // elevation gain of the split
  netElev: number; // change in elevation between start and end points
  heartRate: number | null; // average heart rate of the split
}
