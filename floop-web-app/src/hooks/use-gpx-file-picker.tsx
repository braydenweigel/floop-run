import { useRef, useState } from "react"

import type { GPX } from "@/lib/gpx/models"
import { parseFile } from "@/lib/gpx/parse"

/**
 * Loads .gpx files from a file picker or a drop. Render `input` somewhere, then call `open()`
 * to show the picker or `load(file)` for a dropped file. Failed loads set `error`.
 */
export function useGpxFilePicker(onLoad: (gpx: GPX) => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError(`"${file.name}" isn't a .gpx file.`)
      return
    }

    setError(null)
    setLoading(true)
    try {
      onLoad(await parseFile(file))
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      setError(`Couldn't read "${file.name}": ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".gpx,application/gpx+xml"
      className="hidden"
      onChange={(e) => {
        void load(e.target.files?.[0])
        e.target.value = "" // allow choosing the same file again
      }}
    />
  )

  return {
    open: () => inputRef.current?.click(),
    load,
    input,
    loading,
    error,
    clearError: () => setError(null),
  }
}
