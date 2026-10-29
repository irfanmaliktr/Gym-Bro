import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../components/ui/Icon'
import { useAppData } from '../../../data/AppDataContext'
import { useI18n } from '../../../i18n'
import { formatVolume, formatWeight } from '../../../lib/units'
import { formatShortDate, isSameDay } from '../../../lib/week'
import type { Milestone } from '../milestones'

interface RecentMilestonesProps {
  /** Newest-first achievements derived from completed sessions (PROG-001). */
  milestones: Milestone[]
}

const BADGE_ICONS: Record<Milestone['kind'], string> = {
  e1rm: 'military_tech',
  maxWeight: 'fitness_center',
  maxReps: 'stars',
  maxVolumeSet: 'bolt',
}

/**
 * Section 5 of design-reference/screen_2 — "Recent Milestones" (record carousel).
 *
 * Every card is now a real achievement replayed from `set_logs` by
 * `features/home/milestones.ts`; with no history the section renders an honest
 * empty state instead of sample records. The reference's footnote copy
 * ("Top 5% gym", "Solid form") stays gone (your decision B) — the only note ever
 * shown is the numeric improvement over the record being beaten.
 */
export function RecentMilestones({ milestones }: RecentMilestonesProps) {
  const { t, locale } = useI18n()
  const { unit } = useAppData()
  const navigate = useNavigate()

  return (
    <section className="flex flex-col gap-space-md mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="emoji_events" className="text-accent-neon text-[20px]" />
          <h2 className="font-title-md text-title-md text-text-primary tracking-tight">
            {t('home.milestones.title')}
          </h2>
        </div>
        {milestones.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="font-label-md text-label-md text-text-secondary hover:text-accent-neon transition-colors"
          >
            {t('home.milestones.viewAll')}
          </button>
        ) : null}
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-xl bg-surface-card p-4 shadow-md flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
            <Icon name="workspace_premium" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <p className="font-title-sm text-title-sm text-text-primary font-bold">
              {t('home.milestones.emptyTitle')}
            </p>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
              {t('home.milestones.emptyBody')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-margin px-margin scroll-smooth no-scrollbar">
          {milestones.map((milestone) => {
            const unitLabel = t(`unit.${unit}`)
            const isReps = milestone.kind === 'maxReps'
            const isVolume = milestone.kind === 'maxVolumeSet'
            const volumeUnit = t('home.milestones.volumeUnit', { unit: unitLabel })

            const primary = isReps
              ? { value: String(milestone.value), unit: t('home.milestones.reps') }
              : isVolume
                ? milestone.weightKg > 0
                  ? { value: formatVolume(milestone.value, unit, locale), unit: volumeUnit }
                  : { value: String(milestone.reps), unit: t('home.milestones.reps') }
                : { value: formatWeight(milestone.value, unit, locale), unit: unitLabel }

            const delta = milestone.value - milestone.previous
            const deltaLabel =
              milestone.previous > 0 && delta > 0
                ? isReps
                  ? t('home.milestones.betterBy', { delta: String(delta), unit: t('home.milestones.reps') })
                  : isVolume
                    ? t('home.milestones.betterBy', {
                        delta: formatVolume(delta, unit, locale),
                        unit: volumeUnit,
                      })
                    : t('home.milestones.betterBy', {
                        delta: formatWeight(delta, unit, locale),
                        unit: unitLabel,
                      })
                : null

            const achieved = new Date(milestone.achievedAt)
            const now = new Date()
            const yesterday = new Date(now)
            yesterday.setDate(now.getDate() - 1)
            const dayLabel = isSameDay(achieved, now)
              ? t('common.today')
              : isSameDay(achieved, yesterday)
                ? t('common.yesterday')
                : formatShortDate(locale, achieved)

            return (
              <div
                key={milestone.id}
                className="shrink-0 w-72 rounded-xl bg-surface-card p-4 shadow-md flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-neon-dim text-accent-neon font-label-sm text-label-sm font-bold uppercase tracking-wider mb-2">
                      <Icon name={BADGE_ICONS[milestone.kind]} fill className="text-[13px]" />
                      {t(`home.milestones.${milestone.kind}`)}
                    </span>
                    {/* h3 (not the reference's h4) keeps the heading order
                        sequential inside the section — no visual change. */}
                    <h3 className="font-title-sm text-title-sm text-text-primary font-bold truncate">
                      {milestone.exerciseName}
                    </h3>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="font-numeric-input text-numeric-input text-accent-neon">
                        {primary.value}
                      </span>
                      <span className="font-body-sm text-body-sm text-text-secondary">
                        {primary.unit}
                      </span>
                      {deltaLabel ? (
                        <span className="font-label-sm text-label-sm ml-1 text-accent-neon font-semibold">
                          {deltaLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                    <Icon name={BADGE_ICONS[milestone.kind]} className="text-[22px]" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border-subtle/50 text-text-secondary font-body-sm text-body-sm">
                  <span className="truncate">
                    {dayLabel} • {milestone.routineName}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
