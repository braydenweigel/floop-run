import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { activityStart, activityTitle } from "@/lib/activity"
import { formatActivityType, formatClockTime, formatLongDate } from "@/lib/format"
import type { GPX } from "@/lib/gpx/models"

/** Activity name, "date · time · type" and the file it came from. */
function ActivityTitle({
  gpx,
  fileName,
  className,
}: {
  gpx: GPX
  fileName: string
  className?: string
}) {
  const start = activityStart(gpx)
  const time = formatClockTime(start)
  const details = [
    formatLongDate(start),
    [time.value, time.unit].filter(Boolean).join(" "),
    formatActivityType(gpx.track.type),
  ].filter(Boolean)

  return (
    <div className={cn("flex min-w-0 items-center gap-4", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[15px] leading-tight font-semibold">{activityTitle(gpx, fileName)}</h1>
        <p className="truncate text-xs text-muted-foreground">{details.join(" · ")}</p>
      </div>
      <span className="hidden min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground lg:flex">
        <HugeiconsIcon icon={File01Icon} className="size-3.5 shrink-0" />
        <span className="truncate">{fileName}</span>
      </span>
    </div>
  )
}

export { ActivityTitle }
