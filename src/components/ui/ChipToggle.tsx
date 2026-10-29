import type { ReactNode } from 'react'

interface ChipToggleProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
  /** Accessible name when the label alone is not descriptive enough. */
  ariaLabel?: string
}

/**
 * Pill toggle used for filter chips, muscle pickers and weekday selectors.
 *
 * Height follows the Stitch chip (36px) rather than the 44px touch guideline —
 * consistent with the reference's own day/filter chips, while every primary
 * action in the app stays at 44px or more.
 */
export function ChipToggle({ selected, onClick, children, ariaLabel }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-[40px] px-3 py-1 rounded-lg font-label-md text-label-md leading-tight transition-all active:scale-95 whitespace-nowrap flex items-center ${
        selected
          ? 'bg-accent-neon text-text-on-accent font-body-bold'
          : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}
