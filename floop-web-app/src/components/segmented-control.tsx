import { cn } from "cn"

export interface SegmentedOption<T extends string> {
  value: T
  label: string // accessible name
  display?: string // shorter visible text, defaults to label
  disabled?: boolean
}

/** A row of mutually exclusive options (a radio group styled as joined buttons). */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  optionClassName,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string // accessible name for the group
  className?: string
  optionClassName?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex h-11 items-center rounded-lg bg-muted p-1 md:h-9", className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-full rounded-md px-2.5 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
              // dark mode's card color is darker than the muted track, so the selected option is
              // lifted with a translucent white instead
              selected
                ? "bg-card text-foreground shadow-xs dark:bg-white/15"
                : "text-muted-foreground hover:text-foreground",
              optionClassName,
            )}
          >
            {option.display ?? option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
