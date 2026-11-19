import type { GPX } from "@/lib/gpx/models"

/** When the activity started: the file's metadata time, or the first point's time if that's missing. */
export function activityStart(gpx: GPX): Date {
  if (gpx.startTime.getTime() !== 0) return gpx.startTime
  return gpx.track.segment.trackPoints[0]?.time ?? gpx.startTime
}

/** The track's name, or the file name without its extension. */
export function activityTitle(gpx: GPX, fileName: string): string {
  return gpx.track.name || fileName.replace(/\.gpx$/i, "")
}
