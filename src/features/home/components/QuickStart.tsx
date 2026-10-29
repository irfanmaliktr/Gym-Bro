import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../components/ui/Icon'
import { useToast } from '../../../components/ui/Toast'
import { useAppData } from '../../../data/AppDataContext'
import type { RoutineBundle } from '../../../db'
import { useI18n } from '../../../i18n'
import { summariseRoutine } from '../../../lib/routineStats'
import { weekdayShortLabel, type IsoWeekday } from '../../../lib/week'

interface QuickStartProps {
  /** Real templates from `user_routines` (active only, newest edit first). */
  routines: RoutineBundle[]
}

/** Cards shown before the row is considered a "top picks" strip. */
const MAX_CARDS = 3

/**
 * Section 3 of design-reference/screen_2 — "Quick Start".
 *
 * The routine chips are the genuinely saved templates now, so there is a single
 * source of truth between Home and the Workout tab. Two reference values are
 * gone because nothing can derive them yet:
 *  - "~45 mins" (no duration model exists) is replaced by the real planned
 *    working-set count, and
 *  - the split tag ("Mon split") becomes the routine's own assigned weekdays.
 *
 * "Start" and "Start Empty Workout" report that session creation arrives in
 * Phase 3 (LOG-001) instead of navigating nowhere.
 */
export function QuickStart({ routines }: QuickStartProps) {
  const { t, locale } = useI18n()
  const { catalogById } = useAppData()
  const showToast = useToast()
  const navigate = useNavigate()

  const logPhaseNote = () => showToast(t('workout.logPhaseNote'), 'info')

  return (
    <section className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h2 className="font-title-md text-title-md text-text-primary tracking-tight">
          {t('home.quickStart')}
        </h2>
        <span className="font-label-md text-label-md text-accent-neon font-medium">
          {t('home.templates')}
        </span>
      </div>

      {/* Main "+ Start Empty Workout" primary CTA card */}
      <div
        role="button"
        tabIndex={0}
        onClick={async () => {
          try {
            const { createEmptySession } = await import('../../../db')
            const { db } = await import('../../../db/database')
            const sessionId = await createEmptySession(t('session.emptyWorkoutName'), db)
            navigate(`/session/${sessionId}`)
          } catch (error) {
            console.error('[gymbro] failed to start empty workout', error)
            logPhaseNote()
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void (async () => {
              try {
                const { createEmptySession } = await import('../../../db')
                const { db } = await import('../../../db/database')
                const sessionId = await createEmptySession(t('session.emptyWorkoutName'), db)
                navigate(`/session/${sessionId}`)
              } catch (error) {
                console.error('[gymbro] failed to start empty workout', error)
                logPhaseNote()
              }
            })()
          }
        }}
        className="group relative w-full rounded-xl bg-surface-card p-space-md shadow-md hover:bg-surface-elevated active:scale-[0.99] transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-accent-neon-dim text-accent-neon flex items-center justify-center transition-transform group-hover:scale-110">
              <Icon name="add" className="text-[28px] font-bold" />
            </div>
            <div>
              <h3 className="font-title-md text-title-md text-text-primary group-hover:text-accent-neon transition-colors font-bold">
                {t('home.startEmpty')}
              </h3>
              <p className="font-body-sm text-body-sm text-text-secondary">{t('home.startEmptyHint')}</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-text-secondary group-hover:text-text-primary group-hover:bg-surface-container-high transition-colors shrink-0">
            <Icon name="chevron_right" className="text-[20px]" />
          </div>
        </div>
      </div>

      {/* Routine chips — horizontally scrollable, bleeds to the screen edges */}
      <div className="flex flex-col gap-2">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          {t('home.savedRoutines')}
        </span>

        {routines.length === 0 ? (
          <div className="rounded-xl bg-surface-card p-4 shadow-md flex flex-col items-start gap-3">
            <p className="font-body-sm text-body-sm text-text-secondary">{t('home.noRoutinesHint')}</p>
            <button
              type="button"
              onClick={() => navigate('/routines/new')}
              className="min-h-[44px] px-4 rounded-lg bg-accent-neon hover:bg-accent-neon-hover active:scale-95 text-text-on-accent font-title-sm text-title-sm flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Icon name="add" className="text-[20px]" />
              <span>{t('workout.createFirstRoutine')}</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-margin px-margin scroll-smooth no-scrollbar">
            {routines.slice(0, MAX_CARDS).map(({ routine, exercises }) => {
              const summary = summariseRoutine(exercises, catalogById)
              const dayLabel =
                routine.assigned_days.length === 0
                  ? t('home.anyDay')
                  : routine.assigned_days
                      .map((day) => weekdayShortLabel(locale, day as IsoWeekday))
                      .join(' / ')

              return (
                <div
                  key={routine.id}
                  className="shrink-0 w-64 rounded-xl bg-surface-card p-3.5 flex flex-col justify-between shadow-md hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-text-secondary">
                        {dayLabel}
                      </span>
                      {/* h3 (not the reference's h4) keeps the heading order
                          sequential under the section's h2 — no visual change. */}
                      <h3 className="font-title-sm text-title-sm text-text-primary font-bold mt-1.5 truncate">
                        {routine.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-text-secondary">
                        {t('home.routineMeta', {
                          exercises: summary.exerciseCount,
                          sets: summary.workingSets,
                        })}
                      </p>
                    </div>
                    <Icon name="fitness_center" className="text-text-secondary text-[20px]" />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { createSessionFromRoutine, getRoutineBundle } = await import('../../../db')
                        const { db } = await import('../../../db/database')
                        const bundle = await getRoutineBundle(routine.id, db)
                        if (!bundle) return logPhaseNote()
                        const exercises = bundle.exercises.map((link, index) => ({
                          exercise_id: link.exercise_id,
                          exercise_name_snap: catalogById.get(link.exercise_id)?.name || routine.name,
                          equipment_snap: catalogById.get(link.exercise_id)?.equipment || 'bodyweight',
                          display_order: index,
                        }))
                        const sessionId = await createSessionFromRoutine(
                          {
                            sourceRoutineId: routine.id,
                            workoutName: routine.name,
                            exercises,
                          },
                          db,
                        )
                        navigate(`/session/${sessionId}`)
                      } catch (error) {
                        console.error('[gymbro] failed to start routine workout', error)
                        logPhaseNote()
                      }
                    }}
                    className="mt-3.5 min-h-[44px] w-full rounded-lg bg-accent-neon hover:bg-accent-neon-hover active:scale-95 text-text-on-accent font-title-sm text-title-sm font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                  >
                    <Icon name="play_arrow" fill className="text-[18px]" />
                    <span>{t('home.start')}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
