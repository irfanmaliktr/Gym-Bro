import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface MenuItemSpec {
  icon: string
  label: string
  onClick: () => void
  destructive?: boolean
}

interface MenuProps {
  /** Accessible name of the trigger, e.g. "More options for Push Day". */
  ariaLabel: string
  items: readonly MenuItemSpec[]
  /** Panel alignment relative to the trigger. */
  align?: 'left' | 'right'
}

/**
 * Overflow menu (`more_vert` → dropdown) used by routine and exercise rows.
 *
 * Closes on outside pointer-down and on Escape so a stray tap cannot leave an
 * orphaned panel floating over the list. Items are 44px tall to stay a legal
 * touch target.
 */
export function Menu({ ariaLabel, items, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
      >
        <Icon name="more_vert" className="text-[20px]" />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute top-full mt-1 z-20 w-48 bg-surface-elevated border border-border-subtle/60 rounded-lg shadow-lg py-1 flex flex-col ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`w-full min-h-[44px] px-3 flex items-center gap-2.5 font-body-sm text-body-sm transition-colors text-left ${
                item.destructive
                  ? 'text-status-error hover:bg-status-error-dim'
                  : 'text-text-primary hover:bg-surface-container-high'
              }`}
            >
              <Icon name={item.icon} className="text-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
