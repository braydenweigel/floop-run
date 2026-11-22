import { useEffect, useMemo } from "react"
import { CircleMarker, MapContainer, Pane, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngBounds, LatLngTuple } from "leaflet"
import { canvas, latLngBounds } from "leaflet"
import { interpolatePlasma, interpolateTurbo, interpolateYlOrRd } from "d3-scale-chromatic"
import "leaflet/dist/leaflet.css"
import { cn } from "cn"

import { SegmentedControl } from "@/components/segmented-control"
import { formatDuration } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX } from "@/lib/gpx/models"
import { routeColoring } from "@/lib/gpx/route-colors"
import type { RouteColoring, RouteMetric } from "@/lib/gpx/route-colors"

// OpenStreetMap's standard (light) tiles, used in both themes
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** What the route line's color shows. */
export type RouteColorMode = "solid" | RouteMetric

// the colormap for each metric, from 0 to 1 (lowest to highest value, but slowest to fastest
// for pace; see routeColoring). to change one,
// swap in any interpolator from d3-scale-chromatic (interpolateMagma, interpolateCividis,
// interpolateInferno, interpolateTurbo, interpolateRdYlBu...)
const COLORMAPS: Record<RouteMetric, (t: number) => string> = {
  pace: interpolatePlasma,
  heartRate: interpolateYlOrRd,
  elevation: interpolateTurbo,
}
// stops for each legend's CSS gradient
const legendGradient = (colormap: (t: number) => string) =>
  Array.from({ length: 11 }, (_, i) => colormap(i / 10)).join(", ")
const UNKNOWN_COLOR = "#a3a3a3" // where a point has no value
const LEVELS = 48 // colors the 0–1 range is split into. neighboring points of one level share a line

/** Map of the activity's route with start and finish markers. */
function RouteMap({
  gpx,
  units,
  colorBy,
  onColorByChange,
  className,
}: {
  gpx: GPX
  units: DistanceUnit
  colorBy: RouteColorMode
  onColorByChange: (mode: RouteColorMode) => void
  className?: string
}) {
  const hasHeartRate = gpx.track.heartRate !== null

  const route = useMemo<LatLngTuple[]>(
    () => gpx.track.segment.trackPoints.map((p) => [p.lat, p.lon]),
    [gpx],
  )
  const bounds = useMemo(() => latLngBounds(route), [route])
  const start = route[0]
  const finish = route[route.length - 1]

  const coloring = useMemo(
    () => (colorBy === "solid" ? null : routeColoring(gpx, colorBy, units)),
    [gpx, colorBy, units],
  )
  const metric = colorBy !== "solid" && coloring ? colorBy : null
  const pieces = useMemo(
    () => (metric && coloring ? colorPieces(route, coloring, COLORMAPS[metric]) : []),
    [route, coloring, metric],
  )
  // thousands of short colored lines draw much faster on a canvas than as SVG
  const renderer = useMemo(() => canvas({ padding: 0.5 }), [])

  return (
    <section className={cn("flex flex-col rounded-xl border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-semibold">Route</h2>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Color by</span>
          <SegmentedControl
            label="Color route by"
            options={[
              { value: "solid", label: "Solid" },
              { value: "pace", label: "Pace" },
              { value: "heartRate", label: "Heart rate", disabled: !hasHeartRate },
              { value: "elevation", label: "Elevation" },
            ]}
            value={colorBy}
            onChange={onColorByChange}
            className="max-w-full overflow-x-auto"
          />
        </div>
      </div>

      {/* isolate keeps Leaflet's high z-indexes from covering dialogs */}
      <div className="relative isolate mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border">
        {/* start/finish key and color scale, over the map's bottom-left corner. the map is always light */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-1000 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-white/90 px-2 py-1 text-xs text-neutral-700 shadow-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-neutral-900 bg-white" />
            Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-neutral-900" />
            Finish
          </span>
          {metric && coloring && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <span>{formatValue(metric, coloring.from)}</span>
              <span
                className="h-1.5 w-16 rounded-full"
                style={{ background: `linear-gradient(to right, ${legendGradient(COLORMAPS[metric])})` }}
              />
              <span>
                {formatValue(metric, coloring.to)} {valueUnit(metric, units)}
              </span>
            </span>
          )}
        </div>
        <MapContainer bounds={bounds} boundsOptions={{ padding: [24, 24] }} className="route-map size-full">
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
          {metric ? (
            <>
              {/* a dark edge keeps the yellow end of the colormap visible on the map */}
              <Polyline
                positions={route}
                renderer={renderer}
                interactive={false}
                pathOptions={{ color: "#171717", opacity: 0.35, weight: 7, lineJoin: "round" }}
              />
              {pieces.map((piece, i) => (
                <Polyline
                  key={`${metric}-${i}`}
                  positions={piece.positions}
                  renderer={renderer}
                  interactive={false}
                  pathOptions={{ color: piece.color, opacity: 1, weight: 4, lineJoin: "round" }}
                />
              ))}
            </>
          ) : (
            <Polyline positions={route} pathOptions={{ className: "route-line", weight: 4 }} />
          )}
          {/* own pane so the markers stay above the colored route */}
          <Pane name="route-markers" style={{ zIndex: 450 }}>
            <CircleMarker
              center={start}
              radius={6}
              pathOptions={{ className: "route-start", weight: 2.5, fillOpacity: 1 }}
            />
            <CircleMarker
              center={finish}
              radius={5}
              pathOptions={{ className: "route-finish", weight: 2, fillOpacity: 1 }}
            />
          </Pane>
          <FitBounds bounds={bounds} />
        </MapContainer>
      </div>
    </section>
  )
}

/** Splits the route into runs of points with the same color level, each drawn as one line. */
function colorPieces(
  route: LatLngTuple[],
  { t }: RouteColoring,
  colormap: (t: number) => string,
) {
  const level = (v: number | null) => (v === null ? -1 : Math.round(v * (LEVELS - 1)))
  const pieces: { color: string; positions: LatLngTuple[] }[] = []
  let current = -2
  for (let i = 0; i < route.length; i++) {
    const l = level(t[i])
    if (l !== current) {
      // a new piece starts at the previous point so there's no gap between pieces
      const positions = i > 0 ? [route[i - 1], route[i]] : [route[i]]
      pieces.push({ color: l < 0 ? UNKNOWN_COLOR : colormap(l / (LEVELS - 1)), positions })
      current = l
    } else {
      pieces[pieces.length - 1].positions.push(route[i])
    }
  }
  return pieces
}

function formatValue(metric: RouteMetric, value: number): string {
  return metric === "pace" ? formatDuration(value) : String(Math.round(value))
}

function valueUnit(metric: RouteMetric, units: DistanceUnit): string {
  if (metric === "pace") return `/${units}`
  if (metric === "heartRate") return "bpm"
  return units === Unit.Miles ? "ft" : "m"
}

/** Re-fits the map when a different activity is loaded (MapContainer only reads `bounds` once). */
function FitBounds({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] })
  }, [map, bounds])
  return null
}

export { RouteMap }
