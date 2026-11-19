import type { GPX, Track, TrackPoint } from "./models";
import { avgHeartRate, byTime } from "./split";

/** Reads a GPX file (e.g. from an <input type="file">) and parses it. */
export async function parseFile(file: File): Promise<GPX> {
  return parseGPX(await file.text());
}

/** Parses GPX XML text and calculates the activity statistics. */
export function parseGPX(xml: string): GPX {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Invalid GPX: ${parseError.textContent ?? "malformed XML"}`);
  }

  const root = doc.documentElement;
  if (root.localName !== "gpx") {
    throw new Error(`Invalid GPX: expected <gpx> root, got <${root.localName}>`);
  }

  return {
    track: parseTrack(child(root, "trk")),
    startTime: parseTime(text(child(child(root, "metadata"), "time"))),
  };
}

function parseTrack(trk: Element | null): Track {
  // all of the track's segments are treated as one continuous recording
  const raw = children(trk, "trkseg").flatMap((seg) => children(seg, "trkpt").map(parseTrackPoint));
  if (raw.length === 0) {
    throw new Error("No Data");
  }

  // running totals from the start of the activity
  const startTime = raw[0].time.getTime();
  let distance = 0;
  let elevGain = 0;
  const trackPoints: TrackPoint[] = raw.map((p, i) => {
    const prev = raw[i - 1];
    if (prev) {
      distance += haversine(prev.lat, prev.lon, p.lat, p.lon);
      elevGain += Math.max(0, p.elevation - prev.elevation);
    }
    return { ...p, distance, elevGain, duration: p.time.getTime() - startTime };
  });

  const first = trackPoints[0];
  const last = trackPoints[trackPoints.length - 1];

  return {
    name: text(child(trk, "name")),
    type: text(child(trk, "type")),
    segment: { trackPoints },
    distance: last.distance,
    elevationGain: last.elevGain,
    activityTime: last.duration,
    netElev: last.elevation - first.elevation,
    heartRate:
      trackPoints.length === 1
        ? first.heartRate // a single point covers no time, so its reading is the average
        : avgHeartRate(trackPoints, byTime, 0, last.duration / 1000, true),
  };
}

type RawPoint = Pick<TrackPoint, "lat" | "lon" | "elevation" | "time" | "heartRate">;

function parseTrackPoint(pt: Element): RawPoint {
  // <hr> is namespaced (e.g. <gpxtpx:hr>), so elements are matched by local name
  const hr = child(child(child(pt, "extensions"), "TrackPointExtension"), "hr");

  return {
    lat: parseNumber(pt.getAttribute("lat") ?? "", "lat"),
    lon: parseNumber(pt.getAttribute("lon") ?? "", "lon"),
    elevation: parseNumber(text(child(pt, "ele")), "ele"),
    time: parseTime(text(child(pt, "time"))),
    heartRate: hr ? Math.trunc(parseNumber(text(hr), "hr")) : null,
  };
}

/** Great-circle distance in meters between two coordinates. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- XML helpers (match on localName so namespace prefixes don't matter) ---

function children(el: Element | null, name: string): Element[] {
  return el ? Array.from(el.children).filter((c) => c.localName === name) : [];
}

function child(el: Element | null, name: string): Element | null {
  return children(el, name)[0] ?? null;
}

function text(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

/** Missing values are 0; invalid values throw. */
function parseNumber(value: string, field: string): number {
  if (value === "") return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid GPX: bad ${field} value "${value}"`);
  }
  return n;
}

/** Missing times fall back to the Unix epoch (so durations come out as 0); invalid times throw. */
function parseTime(value: string): Date {
  if (value === "") return new Date(0);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid GPX: bad time value "${value}"`);
  }
  return date;
}
