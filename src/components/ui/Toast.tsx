import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Minimal toast queue for action feedback ("Routine saved", "Routine archived").
 *
 * Until workout logging lands (Phase 3) a few buttons can only explain that the
 * feature arrives later; a toast keeps that honest message out of the layout
 * instead of pretending the tap did something.
 */

interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'info'
}

type ShowToast = (text: string, tone?: ToastMessage['tone']) => void

const ToastContext = createContext<ShowToast | null>(null)

const TOAST_DURATION_MS = 2600

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(1)

  const showToast = useCallback<ShowToast>((text, tone = 'success') => {
    const id = nextId.current
    nextId.current += 1
    setToasts((current) => [...current, { id, text, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const value = useMemo(() => showToast, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        Sits above the mobile bottom nav (64px + safe area) and centred on
        desktop. `pointer-events-none` keeps it from swallowing taps.
      */}
      <div
        className="fixed bottom-24 md:bottom-6 left-0 right-0 z-[80] flex flex-col items-center gap-2 px-margin pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="w-full max-w-md md:w-auto md:max-w-lg bg-surface-elevated border border-border-subtle/60 text-text-primary font-body-sm text-body-sm px-4 py-3 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center gap-2"
          >
            <Icon
              name={toast.tone === 'success' ? 'check_circle' : 'info'}
              fill
              className="text-accent-neon text-[18px] shrink-0"
            />
            <span className="min-w-0">{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within <ToastProvider>')
  return context
}
