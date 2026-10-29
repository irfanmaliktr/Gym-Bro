import { useMemo } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { useI18n } from '../../../i18n'
import { buildWeekStrip } from '../../../lib/week'

interface WeeklyActivityProps {
  /** Local day keys (`isoDateKey`) holding at least one completed session. */
  completedDays: ReadonlySet<string>
  /** Completed sessions in the current ISO week. */
  completedThisWeek: number
}

/**
 * Section 4 of design-reference/screen_2 — weekly activity.
 *
 * Three deliberate departures from the reference, following your Phase 0
 * decisions (see the report):
 *  1. The "Goal: 4" pill is removed — weekly workout goals are out of v1 scope.
 *     The title reports the real count of completed sessions this week.
 *  2. The progress meter is removed as well (decision C): with no weekly
 *     target defined, a bar filled against "7 days" implied a goal the product
 *     does not have. Only the data-backed information — the 7-day tracker and
 *     the completed-workout count — is kept.
 *  3. The strip is built from stored sessions (`buildWeekStrip`), not from a
 *     mock weekday list, so a day is marked trained only when it really was.
 *
 * `text-text-muted` was replaced by `text-text-secondary` on the weekday
 * letters (decision A) so the labels clear WCAG AA; today vs trained vs rest is
 * still unambiguous from the neon tile, the check icon and the rest dot.
 */
export function WeeklyActivity({ completedDays, completedThisWeek }: WeeklyActivityProps) {
  const { t, locale } = useI18n()
  const week = useMemo(() => buildWeekStrip(locale, completedDays), [locale, completedDays])

  return (
    <section className="rounded-xl bg-surface-card p-space-md shadow-md flex flex-col gap-space-md">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
            {t('home.weekly.label')}
          </span>
          <h3 className="font-title-sm text-title-sm text-text-primary font-bold mt-0.5">
            {completedThisWeek === 1
              ? t('home.weekly.titleOne')
              : t('home.weekly.title', { count: completedThisWeek })}
          </h3>
        </div>
      </div>

      {/* 7-day visual tracker (Mon → Sun) */}
      <div className="grid grid-cols-7 gap-2 pt-1">
        {week.map((day) => (
          <div key={day.iso} className="flex flex-col items-center gap-2">
            <span
              className={`font-label-sm text-label-sm ${
                day.status === 'today' ? 'text-accent-neon font-bold' : 'text-text-secondary'
              }`}
            >
              {day.label}
            </span>
            {day.status === 'rest' ? (
              <div className="w-9 h-11 rounded-lg bg-surface-container flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              </div>
            ) : (
              <div className="w-9 h-11 rounded-lg bg-accent-neon text-text-on-accent flex items-center justify-center shadow-[0_0_12px_rgba(182,255,0,0.35)] relative">
                <Icon
                  name={day.status === 'today' ? 'fitness_center' : 'check'}
                  className="text-[20px] font-bold"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
