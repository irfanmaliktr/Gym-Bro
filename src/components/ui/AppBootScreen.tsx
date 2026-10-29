import { useI18n } from '../../i18n'

/**
 * Full-canvas splash shown while the first IndexedDB read is in flight.
 *
 * Without it the router would briefly see "no profile row yet" and bounce a
 * returning user into onboarding (the Flow A detection relies on the row's
 * absence), so the gates wait for `ready` before deciding anything.
 */
export function AppBootScreen() {
  const { t } = useI18n()

  return (
    <div
      className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-baseline gap-1 select-none">
        <span className="font-display-mobile text-display-mobile tracking-tight uppercase text-text-primary">
          gymbro
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent-neon shadow-lg shadow-accent-neon/30" />
      </span>
      <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-text-secondary animate-pulse">
        {t('common.loading')}
      </span>
    </div>
  )
}
