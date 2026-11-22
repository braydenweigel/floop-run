import { interpolatePlasma, interpolateTurbo, interpolateYlOrRd } from "d3-scale-chromatic"

import type { RouteMetric } from "@/lib/gpx/route-colors"

/**
 * The colormap for each metric, used by the route map and the splits bars. Each goes from 0 to 1:
 * lowest to highest value, except pace, which goes from slowest to fastest.
 * To change one, swap in any interpolator from d3-scale-chromatic (interpolateViridis,
 * interpolateMagma, interpolateCividis, interpolateInferno, interpolateRdYlBu...).
 */
export const COLORMAPS: Record<RouteMetric, (t: number) => string> = {
  pace: interpolatePlasma,
  heartRate: interpolateYlOrRd,
  elevation: interpolateTurbo,
}

/** Color for a missing value (e.g. no heart rate data there). */
export const UNKNOWN_COLOR = "#a3a3a3"

/** Stops for a CSS gradient showing a colormap, for legends. */
export function colormapGradient(colormap: (t: number) => string): string {
  const stops = Array.from({ length: 11 }, (_, i) => colormap(i / 10)).join(", ")
  return `linear-gradient(to right, ${stops})`
}
