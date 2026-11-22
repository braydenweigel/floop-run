import { useId, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { SegmentedControl } from "@/components/segmented-control"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  customSplitRows,
  parseDistance,
  parseIntervals,
  parseTime,
} from "@/lib/custom-splits"
import type { CustomSplitDef, SplitKind } from "@/lib/custom-splits"
import { formatDuration } from "@/lib/format"
import { Unit } from "@/lib/gpx/models"
import type { DistanceUnit, GPX } from "@/lib/gpx/models"
import { unitMeters } from "@/lib/gpx/split"

type Field = "length" | "start" | "intervals"
type Errors = Partial<Record<Field | "form", string>>

const EMPTY = { length: "", start: "", intervals: "", partial: true }

/** "Add splits" button and the dialog for defining a custom split by distance or time. */
function AddSplitsDialog({
  gpx,
  units,
  onAdd,
}: {
  gpx: GPX
  units: DistanceUnit
  onAdd: (def: CustomSplitDef) => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<SplitKind>("distance")
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const id = useId()

  const unitName = units === Unit.Miles ? "mi" : "km"
  const totalDistance = gpx.track.distance // meters
  const totalTime = gpx.track.activityTime // ms
  const amount = (n: number) =>
    kind === "distance"
      ? `${Number((n / unitMeters(units)).toFixed(2))} ${unitName}`
      : formatDuration(n)

  const reset = () => {
    setKind("distance")
    setValues(EMPTY)
    setErrors({})
  }

  const edit = (field: Field | "partial", value: string | boolean) => {
    setValues((v) => ({ ...v, [field]: value }))
    // clear this field's error (and the overall one) once the user changes it
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }))
  }

  const changeKind = (next: SplitKind) => {
    setKind(next)
    // distance and time are entered differently, so start the fields over
    setValues(EMPTY)
    setErrors({})
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    // 1. each field on its own
    const parse = (text: string, optional: boolean) =>
      kind === "distance"
        ? parseDistance(text, units, { optional })
        : parseTime(text, { optional })
    const length = parse(values.length, false)
    const start = parse(values.start, true)
    const intervals = parseIntervals(values.intervals)
    const fieldErrors: Errors = {
      length: "error" in length ? length.error : undefined,
      start: "error" in start ? start.error : undefined,
      intervals: "error" in intervals ? intervals.error : undefined,
    }
    if ("error" in length || "error" in start || "error" in intervals) {
      setErrors(fieldErrors)
      return
    }

    // 2. whether the splits fit in the activity
    const total = kind === "distance" ? totalDistance : totalTime
    const def: CustomSplitDef = {
      id: crypto.randomUUID(),
      kind,
      length: length.value,
      start: start.value,
      intervals: intervals.value,
      partial: intervals.value === 0 && values.partial,
    }
    const fitError = checkFit(def, total, amount)
    if (fitError) {
      setErrors(fitError)
      return
    }

    // 3. the calculation itself (catches anything the checks above missed)
    try {
      customSplitRows(gpx, def, units)
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : String(err) })
      return
    }

    onAdd(def)
    setOpen(false)
  }

  const inputSuffix = kind === "distance" ? unitName : "m:ss"
  const field = (
    name: Field,
    label: string,
    placeholder: string,
    hint?: string
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}-${name}`}>{label}</Label>
      <div className="relative">
        <Input
          id={`${id}-${name}`}
          inputMode={
            kind === "distance" || name === "intervals" ? "decimal" : "text"
          }
          autoComplete="off"
          placeholder={placeholder}
          value={values[name]}
          onChange={(e) => edit(name, e.target.value)}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={`${id}-${name}-note`}
          className={name === "intervals" ? undefined : "pr-12"}
        />
        {name !== "intervals" && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {inputSuffix}
          </span>
        )}
      </div>
      <p
        id={`${id}-${name}-note`}
        className={
          errors[name]
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {errors[name] ?? hint}
      </p>
    </div>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset()
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <HugeiconsIcon
          icon={Add01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Add splits
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add custom splits</DialogTitle>
            <DialogDescription>
              Split this activity ({amountOf("distance", totalDistance, units)},{" "}
              {formatDuration(totalTime)}) into equal parts by distance or time.
            </DialogDescription>
          </DialogHeader>

          <SegmentedControl
            label="Split by"
            options={[
              { value: "distance", label: "Distance" },
              { value: "time", label: "Time" },
            ]}
            value={kind}
            onChange={changeKind}
            className="w-full [&>button]:flex-1"
          />

          {field(
            "length",
            "Split length",
            kind === "distance" ? "e.g. 2" : "e.g. 5:00",
            kind === "distance" ? undefined : "m:ss, h:mm:ss, or minutes"
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("start", "Start at", "0", "Optional")}
            {field(
              "intervals",
              "Number of splits",
              "As many as fit",
              "Optional"
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`${id}-partial`}
              checked={values.partial && values.intervals.trim() === ""}
              disabled={values.intervals.trim() !== ""}
              onCheckedChange={(checked) => edit("partial", checked)}
            />
            <Label
              htmlFor={`${id}-partial`}
              className="font-normal peer-disabled:opacity-50"
            >
              Include a shorter split for whatever is left at the end
            </Label>
          </div>

          {errors.form && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Add splits</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Checks that the splits fit in the activity. `total` and the def are in meters or ms. */
function checkFit(
  def: CustomSplitDef,
  total: number,
  amount: (n: number) => string
): Errors | null {
  const { length, start, intervals, partial } = def
  if (start >= total) {
    return {
      start: `Must be before the end of the activity (${amount(total)})`,
    }
  }
  if (intervals > 0) {
    const end = start + intervals * length
    if (end > total) {
      const most = Math.floor((total - start) / length)
      return {
        intervals:
          most > 0
            ? `Only ${most} ${most === 1 ? "split fits" : "splits fit"} (${amount(total - start)} left after the start)`
            : `Not even one split fits (${amount(total - start)} left after the start)`,
      }
    }
  } else if (start + length > total && !partial) {
    return {
      length: `Longer than what's left after the start (${amount(total - start)}). Use a shorter length, or include the leftover split`,
    }
  }
  return null
}

function amountOf(kind: SplitKind, n: number, units: DistanceUnit) {
  return kind === "distance"
    ? `${(n / unitMeters(units)).toFixed(2)} ${units}`
    : formatDuration(n)
}

export { AddSplitsDialog }
