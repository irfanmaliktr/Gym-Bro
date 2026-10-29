import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChipToggle } from '../../components/ui/ChipToggle'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../../data/AppDataContext'
import { useI18n } from '../../i18n'
import { isoWeekday, weekdayShortLabel, type IsoWeekday } from '../../lib/week'
import { LibraryPanel } from './components/LibraryPanel'
import { RoutineCard } from './components/RoutineCard'

type Tab = 'routines' | 'library'
/** `'none'` = routines with no assigned weekday; a number = that ISO weekday. */
type DayFilter = 'all' | 'none' | number

/**
 * Screen 3 — Workout tab (ROUTINE-001…007, EXER-001…003).
 *
 * The reference's split banner ("4-DAY STREAK", "Next targeted: …") and its
 * "~52m" / "+2.5 kg overload ready" card trailers are intentionally absent:
 * they are claims about the user that no stored data supports yet. The filter
 * chips are driven by ROUTINE-006's `assigned_days` (the PRD's stated purpose
 * for them) instead of the reference's hardcoded muscle chips, and "Start
 * Workout" reports that active logging lands in Phase 3 rather than pretending
 * to open a session.
 */
export function WorkoutPage() {
  const { t, locale } = useI18n()
  const { routines, archivedRoutines, catalogById, actions } = useAppData()
  const showToast = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('routines')
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const today = isoWeekday(new Date())

  // Only offer filters that match real routines, so no chip leads to a dead end.
  const dayOptions = useMemo(() => {
    const days = new Set<number>()
    let unscheduled = false
    for (const bundle of routines) {
      if (bundle.routine.assigned_days.length === 0) unscheduled = true
      for (const day of bundle.routine.assigned_days) days.add(day)
    }
    return { days: [...days].sort((a, b) => a - b), unscheduled }
  }, [routines])

  const visibleRoutines = useMemo(
    () =>
      routines.filter((bundle) => {
        if (dayFilter === 'all') return true
        if (dayFilter === 'none') return bundle.routine.assigned_days.length === 0
        return bundle.routine.assigned_days.includes(dayFilter)
      }),
    [routines, dayFilter],
  )

  const logPhaseNote = () => showToast(t('workout.logPhaseNote'), 'info')

  const startRoutine = async (bundle: any) => {
    try {
      const { createSessionFromRoutine } = await import('../../db')
      const { db } = await import('../../db/database')
      const exercises = bundle.exercises.map((link: any, index: number) => ({
        exercise_id: link.exercise_id,
        exercise_name_snap: catalogById.get(link.exercise_id)?.name || bundle.routine.name,
        equipment_snap: catalogById.get(link.exercise_id)?.equipment || 'bodyweight',
        display_order: index,
      }))
      const sessionId = await createSessionFromRoutine(
        {
          sourceRoutineId: bundle.routine.id,
          workoutName: bundle.routine.name,
          exercises,
        },
        db,
      )
      navigate(`/session/${sessionId}`)
    } catch (error) {
      console.error('[gymbro] failed to start routine workout', error)
      logPhaseNote()
    }
  }

  const duplicate = async (id: string, name: string) => {
    try {
      const copyId = await actions.duplicateRoutineById(id, t('workout.copyLabel'))
      if (copyId) showToast(t('workout.toastDuplicated', { name }))
    } catch (error) {
      console.error('[gymbro] routine could not be duplicated', error)
      showToast(t('common.saveFailed'), 'info')
    }
  }

  const setArchived = async (id: string, name: string, archived: boolean) => {
    try {
      await actions.setRoutineArchivedById(id, archived)
      showToast(archived ? t('workout.toastArchived', { name }) : t('workout.toastRestored', { name }))
    } catch (error) {
      console.error('[gymbro] routine could not be updated', error)
      showToast(t('common.saveFailed'), 'info')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await actions.deleteRoutineById(pendingDelete.id)
      showToast(t('workout.toastDeleted', { name: pendingDelete.name }))
      setPendingDelete(null)
    } catch (error) {
      console.error('[gymbro] routine could not be deleted', error)
      showToast(t('common.saveFailed'), 'info')
    } finally {
      setBusy(false)
    }
  }

  const cardHandlers = (bundle: any) => {
    const id = bundle.routine.id
    const name = bundle.routine.name
    return {
      onStart: () => void startRoutine(bundle),
      onEdit: () => navigate(`/routines/${id}/edit`),
      onDuplicate: () => void duplicate(id, name),
      onArchive: () => void setArchived(id, name, true),
      onRestore: () => void setArchived(id, name, false),
      onDelete: () => setPendingDelete({ id, name }),
    }
  }

  return (
    <>
      <section className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="font-title-lg text-title-lg tracking-tight text-text-primary">
            {t('workout.title')}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">{t('workout.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/routines/new')}
          className="min-h-[44px] shrink-0 px-3.5 rounded-lg bg-accent-neon hover:bg-accent-neon-hover text-text-on-accent font-label-md text-label-md flex items-center gap-1 transition-all active:scale-95 shadow-sm"
        >
          <Icon name="add" className="text-[18px] font-bold" />
          <span>{t('workout.newRoutine')}</span>
        </button>
      </section>

      <div role="tablist" aria-label={t('workout.title')} className="flex items-center gap-1 p-1 bg-bg-canvas rounded-lg">
        {(['routines', 'library'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${
              tab === value
                ? 'bg-surface-card text-accent-neon shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon name={value === 'routines' ? 'list_alt' : 'fitness_center'} className="text-[18px]" />
            <span className="font-label-md text-label-md">
              {value === 'routines' ? t('workout.tabRoutines') : t('workout.tabLibrary')}
            </span>
          </button>
        ))}
      </div>

      {tab === 'library' ? (
        <div role="tabpanel" aria-label={t('workout.tabLibrary')} className="pt-4">
          <LibraryPanel />
        </div>
      ) : (
        <div role="tabpanel" aria-label={t('workout.tabRoutines')} className="pt-4 flex flex-col gap-space-md">
          {routines.length === 0 ? (
            <div className="bg-surface-card rounded-xl p-space-md shadow-md flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-xl bg-accent-neon-dim text-accent-neon flex items-center justify-center">
                <Icon name="fitness_center" className="text-[26px]" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-title-sm text-title-sm text-text-primary font-bold">
                  {t('workout.emptyTitle')}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">{t('workout.emptyBody')}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/routines/new')}
                className="min-h-[44px] px-4 rounded-lg bg-accent-neon hover:bg-accent-neon-hover text-text-on-accent font-title-sm text-title-sm flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Icon name="add" className="text-[20px]" />
                <span>{t('workout.createFirstRoutine')}</span>
              </button>
            </div>
          ) : (
            <>
              {dayOptions.days.length > 0 || dayOptions.unscheduled ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin scroll-smooth no-scrollbar">
                  <ChipToggle selected={dayFilter === 'all'} onClick={() => setDayFilter('all')}>
                    {t('workout.filterAll', { count: routines.length })}
                  </ChipToggle>
                  {dayOptions.days.map((day) => (
                    <ChipToggle
                      key={day}
                      selected={dayFilter === day}
                      onClick={() => setDayFilter(day)}
                    >
                      {weekdayShortLabel(locale, day as IsoWeekday)}
                    </ChipToggle>
                  ))}
                  {dayOptions.unscheduled ? (
                    <ChipToggle selected={dayFilter === 'none'} onClick={() => setDayFilter('none')}>
                      {t('workout.filterUnscheduled')}
                    </ChipToggle>
                  ) : null}
                </div>
              ) : null}

              {visibleRoutines.length === 0 ? (
                <p className="font-body-sm text-body-sm text-text-secondary py-6 text-center">
                  {t('workout.noRoutinesForFilter')}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleRoutines.map((bundle) => (
                    <RoutineCard
                      key={bundle.routine.id}
                      bundle={bundle}
                      catalogById={catalogById}
                      recommendedToday={
                        dayFilter === 'all' && bundle.routine.assigned_days.includes(today)
                      }
                      {...cardHandlers(bundle)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-2 p-4 rounded-xl bg-surface-elevated flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-text-secondary shrink-0">
                <Icon name="bolt" className="text-[20px]" />
              </div>
              <div className="min-w-0">
                <p className="font-title-sm text-title-sm text-text-primary">{t('workout.freestyleTitle')}</p>
                <p className="font-body-sm text-body-sm text-text-secondary">{t('workout.freestyleBody')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { createEmptySession } = await import('../../db')
                  const { db } = await import('../../db/database')
                  const sessionId = await createEmptySession(t('session.emptyWorkoutName'), db)
                  navigate(`/session/${sessionId}`)
                } catch (error) {
                  console.error('[gymbro] failed to start empty workout', error)
                  logPhaseNote()
                }
              }}
              className="min-h-[44px] shrink-0 px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-text-primary rounded-lg font-title-sm text-title-sm transition-colors"
            >
              {t('workout.freestyleCta')}
            </button>
          </div>

          {archivedRoutines.length > 0 ? (
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                aria-expanded={showArchived}
                className="min-h-[44px] flex items-center justify-between gap-2 font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>{t('workout.archivedSection', { count: archivedRoutines.length })}</span>
                <Icon name={showArchived ? 'expand_less' : 'expand_more'} className="text-[20px]" />
              </button>

              {showArchived ? (
                <div className="flex flex-col gap-4">
                  {archivedRoutines.map((bundle) => (
                    <RoutineCard
                      key={bundle.routine.id}
                      bundle={bundle}
                      catalogById={catalogById}
                      recommendedToday={false}
                      {...cardHandlers(bundle)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('workout.confirmDeleteTitle', { name: pendingDelete?.name ?? '' })}
        body={t('workout.confirmDeleteBody')}
        confirmLabel={t('workout.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
