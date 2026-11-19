import { useState } from "react"
import type { DragEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload04Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { useGpxFilePicker } from "@/hooks/use-gpx-file-picker"
import type { GPX } from "@/lib/gpx/models"

/** Drop zone + file picker that parses a .gpx file and hands back the result. */
function GpxUpload({ onLoad }: { onLoad: (gpx: GPX) => void }) {
  const picker = useGpxFilePicker(onLoad)
  const [dragging, setDragging] = useState(false)

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    // ignore leaving into a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void picker.load(e.dataTransfer.files[0])
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center text-center">
      <h1 className="text-3xl font-semibold tracking-[-0.02em] md:text-[34px]">View a GPX activity</h1>
      <p className="mt-2 text-muted-foreground md:text-[15px]">
        See your route, splits and charts for pace, elevation and heart rate.
      </p>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "mt-6 flex w-full flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 transition-colors",
          dragging && "border-primary bg-muted",
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={Upload04Icon} className="size-6" />
        </div>
        <p className="mt-6 font-semibold md:text-[15px]">Drop a .gpx file here</p>
        <p className="mt-0.5 text-sm text-muted-foreground">or choose one from your device</p>

        <Button className="mt-5 h-11 px-5 text-[15px]" disabled={picker.loading} onClick={picker.open}>
          {picker.loading ? "Loading…" : "Choose file"}
        </Button>
        {picker.input}

        {picker.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {picker.error}
          </p>
        )}
      </div>
    </div>
  )
}

export { GpxUpload }
