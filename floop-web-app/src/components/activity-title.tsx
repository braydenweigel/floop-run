import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { activityStart, activityTitle } from "@/lib/activity"
import { formatActivityType, formatClockTime, formatLongDate, formatShortDate } from "@/lib/format"
import type { GPX } from "@/lib/gpx/models"

/**
 * Activity name with "date · time · type" under it.
 * `header` is the compact version for the top bar; `page` is the larger one for the main section.
 */
function ActivityTitle({
  gpx,
  fileName,
  variant,
  className,
}: {
  gpx: GPX
  fileName: string
  variant: "header" | "page"
  className?: string
}) {
  const start = activityStart(gpx)
  const time = formatClockTime(start)
  const details = [
    variant === "header" ? formatLongDate(start) : formatShortDate(start),
    [time.value, time.unit].filter(Boolean).join(" "),
    formatActivityType(gpx.track.type),
  ].filter(Boolean)

  return (
    <div className={cn("min-w-0", className)}>
      <h1
        className={cn(
          "truncate leading-tight font-semibold",
          variant === "header" ? "text-[15px]" : "text-lg tracking-[-0.01em]",
        )}
      >
        {activityTitle(gpx, fileName)}
      </h1>
      <p className={cn("truncate text-muted-foreground", variant === "header" ? "text-xs" : "mt-0.5 text-[13px]")}>
        {details.join(" · ")}
      </p>
    </div>
  )
}

/** Pill showing the name of the loaded file. */
function FileChip({ fileName, className }: { fileName: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <HugeiconsIcon icon={File01Icon} className="size-3.5 shrink-0" />
      <span className="truncate">{fileName}</span>
    </span>
  )
}

export { ActivityTitle, FileChip }
