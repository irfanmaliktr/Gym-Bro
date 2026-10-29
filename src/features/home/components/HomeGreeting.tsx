import { Icon } from '../../../components/ui/Icon'
import { useI18n } from '../../../i18n'

interface HomeGreetingProps {
  /** Pre-formatted, locale-aware date line (e.g. "Tuesday, Oct 20"). */
  dateLabel: string
  /** `user_profile.display_name` (ONBD-002). */
  displayName: string
  /** Real consecutive training days; the badge is hidden at 0. */
  streakDays: number
}

/**
 * Section 1 of design-reference/screen_2 — greeting + derived streak badge.
 *
 * Both values are live: the name is the stored profile name and the badge counts
 * real consecutive training days (`lib/week.ts`). At 0 days the badge is not
 * rendered at all, rather than showing a decorative "0d".
 */
export function HomeGreeting({ dateLabel, displayName, streakDays }: HomeGreetingProps) {
  const { t } = useI18n()

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-title-lg text-title-lg text-text-primary tracking-tight">
            {t('home.greeting', { name: displayName })}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
            {dateLabel} • {t('home.subtitle')}
          </p>
        </div>
        {streakDays > 0 ? (
          <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-surface-elevated text-accent-neon shadow-md">
            <Icon name="local_fire_department" className="text-[24px]" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-accent-neon text-text-on-accent font-label-sm text-label-sm font-bold shadow-sm">
              {t('home.streakBadge', { days: streakDays })}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
