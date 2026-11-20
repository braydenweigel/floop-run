import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload04Icon } from "@hugeicons/core-free-icons"

import { ActivityProfile } from "./components/activity-profile"
import { ActivityStats } from "./components/activity-stats"
import { ActivityTitle, FileChip } from "./components/activity-title"
import { GpxUpload } from "./components/gpx-upload"
import { RouteMap } from "./components/route-map"
import { SplitsCard } from "./components/splits-card"
import { ThemeToggle } from "./components/theme-toggle"
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
import { Button } from "./components/ui/button"
import { UnitToggle } from "./components/unit-toggle"
import { useGpxFilePicker } from "./hooks/use-gpx-file-picker"
import { Unit } from "./lib/gpx/models"
import type { DistanceUnit, GPX } from "./lib/gpx/models"

interface Activity {
  gpx: GPX
  fileName: string
}

export function App() {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [units, setUnits] = useState<DistanceUnit>(Unit.Miles)

  const loadActivity = (gpx: GPX, file: File) => setActivity({ gpx, fileName: file.name })
  const picker = useGpxFilePicker(loadActivity)

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground antialiased">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-15 items-center justify-between gap-4 pr-3 pl-4 md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 shrink-0 items-center rounded-lg bg-primary px-2.5 text-sm font-semibold tracking-[-0.01em] whitespace-nowrap text-primary-foreground">
              Floop.Run Web
            </span>
            {activity && (
              <div className="hidden min-w-0 items-center gap-4 md:flex">
                <ActivityTitle gpx={activity.gpx} fileName={activity.fileName} variant="header" />
                <FileChip fileName={activity.fileName} className="hidden lg:flex" />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            {activity && (
              <>
                <div className="md:hidden">
                  <UnitToggle value={units} onChange={setUnits} compact />
                </div>
                <div className="hidden md:block">
                  <UnitToggle value={units} onChange={setUnits} />
                </div>
                <Button
                  variant="outline"
                  aria-label="Open GPX file"
                  disabled={picker.loading}
                  onClick={picker.open}
                  className="size-11 bg-card shadow-xs md:h-9 md:w-auto dark:bg-card"
                >
                  <HugeiconsIcon icon={Upload04Icon} />
                  <span className="hidden lg:inline">Open GPX file</span>
                </Button>
                {picker.input}
              </>
            )}
            <ThemeToggle className="size-11 md:size-9" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pt-5 pb-6 md:px-6 md:pt-4 md:pb-6">
        {activity === null ? (
          <div className="flex flex-1 flex-col justify-center md:flex-none md:pt-30">
            <GpxUpload onLoad={loadActivity} />
          </div>
        ) : (
          <>
            {/* the header has no room for the title on small screens */}
            <div className="flex items-center justify-between gap-3 md:hidden">
              <ActivityTitle gpx={activity.gpx} fileName={activity.fileName} variant="page" />
              <FileChip fileName={activity.fileName} className="max-w-[45%]" />
            </div>
            <ActivityStats gpx={activity.gpx} units={units} />
            <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
              {/* side by side (lg+) both cards are 60% of the viewport tall. stacked, the splits card fits its rows, up to 60% */}
              <SplitsCard gpx={activity.gpx} units={units} className="max-h-[60svh] lg:h-[60svh] lg:min-h-72" />
              <RouteMap gpx={activity.gpx} className="h-[60svh] min-h-72" />
            </div>
            <ActivityProfile gpx={activity.gpx} units={units} className="min-h-64 flex-1" />
          </>
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

export default App
