import { Icon } from '../../components/ui/Icon'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  /** Visible group label (also used as the radio group's accessible name). */
  label: string
  icon: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Two-option segmented control from design-reference/screen_1 (ONBD-003/004).
 * Implemented as a real ARIA radiogroup: arrow keys and Space/Enter work, and
 * the selected state is announced instead of being colour-only.
 */
export function SegmentedControl<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-space-xs">
      <span className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
        <Icon name={icon} className="text-text-secondary text-[16px]" />
        <span id={`segmented-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</span>
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 p-1 bg-bg-canvas rounded-lg gap-1.5"
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all duration-200 ${
                selected
                  ? 'bg-surface-elevated text-accent-neon shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {selected ? <Icon name="check" className="text-sm font-bold" /> : null}
              <span className="font-body-bold">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
