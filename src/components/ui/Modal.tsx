import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog when no visible title is rendered. */
  label?: string
  children: ReactNode
  /** Sticky action row at the bottom of the panel. */
  footer?: ReactNode
  /** Panel width override, e.g. `md:max-w-lg`. */
  className?: string
}

/**
 * Bottom-sheet on mobile / centred dialog from `md` up, following the dark
 * Stitch surfaces. Handles the accessible basics a dialog must not skip:
 * Escape to dismiss, body scroll lock, initial focus, focus restoration and a
 * Tab loop so focus cannot escape behind the overlay.
 */
export function Modal({ open, onClose, label, children, footer, className = '' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined

    restoreFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative w-full md:max-w-md max-h-[92vh] overflow-y-auto bg-surface-card rounded-t-2xl md:rounded-xl border border-border-subtle/60 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] p-space-md flex flex-col gap-space-md outline-none ${className}`}
      >
        {children}
        {footer ? <div className="flex items-center gap-3">{footer}</div> : null}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  title: string
  onClose: () => void
  /** Rendered under the title (e.g. a warning line). */
  subtitle?: string
}

export function ModalHeader({ title, onClose, subtitle }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col min-w-0">
        <h2 className="font-title-md text-title-md text-text-primary font-bold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="w-9 h-9 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors shrink-0"
      >
        <Icon name="close" className="text-[20px]" />
      </button>
    </div>
  )
}
