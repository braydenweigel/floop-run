import { useState } from "react"

import { ThemeToggle } from "./components/theme-toggle"
import type { GPX } from "./lib/gpx/models"

export function App() {
  const [gpx, setGpx] = useState<GPX | null>(null)

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

            <ThemeToggle className="size-11 md:size-9" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pt-5 pb-6 md:block md:flex-none md:px-6 md:pt-10 md:pb-14">

      </main>
    </div>
  )
}

export default App
