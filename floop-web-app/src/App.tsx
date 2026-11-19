import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload04Icon } from "@hugeicons/core-free-icons"

import { GpxUpload } from "./components/gpx-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog"
import { ThemeToggle } from "./components/theme-toggle"
import { Button } from "./components/ui/button"
import { UnitToggle } from "./components/unit-toggle"
import type { DistanceUnit } from "./components/unit-toggle"
import { useGpxFilePicker } from "./hooks/use-gpx-file-picker"
import { Unit } from "./lib/gpx/models"
import type { GPX } from "./lib/gpx/models"
import { unitMeters } from "./lib/gpx/split"

export function App() {
  const [gpx, setGpx] = useState<GPX | null>(null)
  const [units, setUnits] = useState<DistanceUnit>(Unit.Miles)
  const picker = useGpxFilePicker(setGpx)

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground antialiased">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-15 items-center justify-between gap-4 pr-3 pl-4 md:h-16 md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold tracking-[-0.01em] md:text-[15px]">
              Floop.Run Web
            </span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {gpx !== null && (
              <>
                <UnitToggle value={units} onChange={setUnits} />
                <Button
                  variant="outline"
                  aria-label="Open GPX file"
                  disabled={picker.loading}
                  onClick={picker.open}
                  className="h-11 bg-card shadow-xs md:h-9 dark:bg-card"
                >
                  <HugeiconsIcon icon={Upload04Icon} />
                  <span className="hidden sm:inline">Open GPX file</span>
                </Button>
                {picker.input}
              </>
            )}
            <ThemeToggle className="size-11 md:size-9" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pt-5 pb-6 md:block md:flex-none md:px-6 md:pt-10 md:pb-14">
        {gpx === null ? (
          <div className="flex flex-1 flex-col justify-center md:pt-24">
            <GpxUpload onLoad={setGpx} />
          </div>
        ) : (
          // temporary: raw stats to check the file loaded
          <div>
            <pre>{formatStats(gpx, units)}</pre>
          </div>
        )}
      </main>

      {/* errors from replacing the loaded file. the current activity stays loaded */}
      <AlertDialog
        open={picker.error !== null}
        onOpenChange={(open) => {
          if (!open) picker.clearError()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Couldn't open file</AlertDialogTitle>
            <AlertDialogDescription>{picker.error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                picker.clearError()
                picker.open()
              }}
            >
              Choose another file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Temporary plain-text stats, converted to the chosen units. */
function formatStats(gpx: GPX, units: DistanceUnit): string {
  const { track } = gpx
  // elevation in feet alongside miles, meters alongside kilometers
  const elev = (m: number) =>
    units === Unit.Miles ? `${(m / unitMeters(Unit.Feet)).toFixed(0)} ft` : `${m.toFixed(0)} m`

  return [
    `name:           ${track.name || "(none)"}`,
    `points:         ${track.segment.trackPoints.length}`,
    `distance:       ${(track.distance / unitMeters(units)).toFixed(2)} ${units}`,
    `activity time:  ${formatDuration(track.activityTime)}`,
    `elevation gain: ${elev(track.elevationGain)}`,
    `net elevation:  ${elev(track.netElev)}`,
    `heart rate:     ${track.heartRate === null ? "(no data)" : `${track.heartRate} bpm`}`,
  ].join("\n")
}

/** ms -> h:mm:ss */
function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default App
