import { useEffect, useMemo } from "react"
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet"
import type { LatLngBounds, LatLngTuple } from "leaflet"
import { latLngBounds } from "leaflet"
import "leaflet/dist/leaflet.css"
import { cn } from "cn"

import type { GPX } from "@/lib/gpx/models"

// OpenStreetMap's standard (light) tiles, used in both themes
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Map of the activity's route with start and finish markers. */
function RouteMap({ gpx, className }: { gpx: GPX; className?: string }) {
  const route = useMemo<LatLngTuple[]>(
    () => gpx.track.segment.trackPoints.map((p) => [p.lat, p.lon]),
    [gpx],
  )
  const bounds = useMemo(() => latLngBounds(route), [route])
  const start = route[0]
  const finish = route[route.length - 1]

  return (
    <section className={cn("flex flex-col rounded-xl border bg-card p-4", className)}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Route</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-foreground bg-card" />
            Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-foreground" />
            Finish
          </span>
        </div>
      </div>

      {/* isolate keeps Leaflet's high z-indexes from covering dialogs */}
      <div className="isolate mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border">
        <MapContainer bounds={bounds} boundsOptions={{ padding: [24, 24] }} className="route-map size-full">
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
          <Polyline positions={route} pathOptions={{ className: "route-line", weight: 4 }} />
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
          <FitBounds bounds={bounds} />
        </MapContainer>
      </div>
    </section>
  )
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
