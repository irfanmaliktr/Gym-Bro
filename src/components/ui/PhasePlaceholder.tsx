import { useI18n } from '../../i18n'
import { Icon } from './Icon'

interface PhasePlaceholderProps {
  /** Phase number that will implement this screen (1-7). */
  phase: number
  note: string
}

/**
 * Temporary card shown on placeholder screens until their feature phase lands.
 * Uses the standard card recipe from the design references
 * (`bg-surface-card rounded-xl p-space-md shadow-md`).
 */
export function PhasePlaceholder({ phase, note }: PhasePlaceholderProps) {
  const { t } = useI18n()
  return (
    <section className="bg-surface-card rounded-xl p-space-md shadow-md flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-accent-neon-dim text-accent-neon flex items-center justify-center shrink-0">
        <Icon name="schedule" />
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-accent-neon">
          {t('common.phase', { phase })}
        </span>
        <p className="font-title-sm text-title-sm text-text-primary">{t('common.placeholderTitle')}</p>
        <p className="font-body-md text-body-md text-text-secondary">{note}</p>
      </div>
    </section>
  )
}
