import { Icon } from '../../../components/ui/Icon'
import { Menu, type MenuItemSpec } from '../../../components/ui/Menu'
import type { ExerciseCatalogItem, RoutineExercise } from '../../../db'
import { useI18n } from '../../../i18n'
import { formatRepTarget, summariseRoutine } from '../../../lib/routineStats'
import { weekdayShortLabel, type IsoWeekday } from '../../../lib/week'
import type { RoutineBundle } from '../../../db'

interface RoutineCardProps {
  bundle: RoutineBundle
  catalogById: ReadonlyMap<string, ExerciseCatalogItem>
  /** `assigned_days` contains today (ROUTINE-006) — a real derivation, not a guess. */
  recommendedToday: boolean
  onStart: () => void
  onEdit: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

/** Exercises previewed as bullet rows before the list is summarised. */
const PREVIEW_LIMIT = 4

/**
 * Design-reference/screen_3 routine card.
 *
 * Data-backed departures from the reference:
 *  - "~52m" estimated duration and the "+2.5 kg overload ready" / "Best: 100 kg × 5"
 *    trailers are gone. The PRD defines no duration model and PR history needs a
 *    logged session (Phase 5); the footer instead reports the real planned
 *    working-set count, which the reference also uses on its third card.
 *  - "COMPLETED 2D AGO" needs session history (Phase 4); "RECOMMENDED TODAY" is
 *    shown because routine weekdays are real data.
 */
export function RoutineCard({
  bundle,
  catalogById,
  recommendedToday,
  onStart,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: RoutineCardProps) {
  const { t, locale } = useI18n()
  const { routine, exercises } = bundle
  const archived = routine.is_archived

  const summary = summariseRoutine(exercises, catalogById)
  const preview = exercises.slice(0, PREVIEW_LIMIT)
  const hidden = exercises.length - preview.length

  const dayLabel = routine.assigned_days
    .map((day) => weekdayShortLabel(locale, day as IsoWeekday))
    .join(' / ')

  return (
    <article className="w-full bg-surface-card rounded-xl p-4 shadow-md flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-title-md text-title-md text-text-primary font-bold tracking-tight truncate">
              {routine.name}
            </h2>
            {archived ? (
              <span className="font-label-sm text-label-sm bg-surface-elevated text-text-secondary px-2 py-0.5 rounded-full uppercase font-medium shrink-0">
                {t('workout.archivedBadge')}
              </span>
            ) : recommendedToday ? (
              <span className="font-label-sm text-label-sm bg-accent-neon-dim text-accent-neon px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0">
                {t('workout.recommendedToday')}
              </span>
            ) : null}
          </div>

          {routine.description ? (
            <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">{routine.description}</p>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            {dayLabel ? (
              <span className="font-label-sm text-label-sm bg-surface-elevated text-text-primary px-2.5 py-1 rounded flex items-center gap-1">
                <Icon name="calendar_today" className="text-text-secondary text-[14px]" />
                {dayLabel}
              </span>
            ) : null}
            {summary.muscleGroups.length > 0 ? (
              <span className="font-label-sm text-label-sm bg-surface-elevated text-text-secondary px-2.5 py-1 rounded">
                {summary.muscleGroups.map((muscle) => t(`muscle.${muscle}`)).join(', ')}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {archived ? null : (
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('workout.editRoutineAria', { name: routine.name })}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <Icon name="edit" className="text-[20px]" />
            </button>
          )}
          <RoutineMenu
            routineName={routine.name}
            archived={archived}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
          />        </div>
      </div>

      <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-1.5">
        {exercises.length === 0 ? (
          <p className="font-body-sm text-body-sm text-text-secondary">{t('workout.noExercisesInRoutine')}</p>
        ) : (
          <>
            {preview.map((link) => (
              <ExercisePreviewRow key={link.id} link={link} name={catalogById.get(link.exercise_id)?.name} />
            ))}
            {hidden > 0 ? (
              <p className="font-label-sm text-label-sm text-text-secondary pl-3.5">
                {t('workout.moreExercises', { count: hidden })}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="pt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon name="fitness_center" className="text-[16px] text-accent-neon shrink-0" />
          <span className="font-label-sm text-label-sm text-text-secondary truncate">
            {t('workout.workingSets', { count: summary.workingSets })}
          </span>
        </div>
        {archived ? (
          <button
            type="button"
            onClick={onRestore}
            className="shrink-0 min-h-[44px] px-4 rounded-lg bg-surface-elevated hover:bg-surface-container-high text-text-primary font-title-sm text-title-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Icon name="restore" className="text-[20px]" />
            <span>{t('workout.restore')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="shrink-0 min-h-[44px] px-4 rounded-lg bg-accent-neon hover:bg-accent-neon-hover active:scale-[0.98] text-text-on-accent font-title-sm text-title-sm flex items-center justify-center gap-1.5 shadow transition-all duration-150"
          >
            <Icon name="play_arrow" fill className="text-[20px]" />
            <span>{t('workout.startWorkout')}</span>
          </button>
        )}
      </div>
    </article>
  )
}

function ExercisePreviewRow({ link, name }: { link: RoutineExercise; name?: string }) {
  const { t } = useI18n()
  const reps = formatRepTarget(link)

  return (
    <div className="flex items-center justify-between font-body-sm text-body-sm text-text-primary gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-neon shrink-0" />
        <span className="truncate">{name ?? t('workout.unknownExercise')}</span>
      </div>
      <span className="font-numeric-input text-label-md text-text-secondary shrink-0">
        {reps ? `${link.target_sets} × ${reps}` : t('workout.setsCount', { count: link.target_sets ?? 0 })}
      </span>
    </div>
  )
}

interface RoutineMenuProps {
  routineName: string
  archived: boolean
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
}

function RoutineMenu({
  routineName,
  archived,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: RoutineMenuProps) {
  const { t } = useI18n()

  const items: MenuItemSpec[] = archived
    ? [{ icon: 'restore', label: t('workout.restore'), onClick: onRestore }]
    : [
        { icon: 'content_copy', label: t('workout.duplicate'), onClick: onDuplicate },
        { icon: 'archive', label: t('workout.archive'), onClick: onArchive },
      ]
  items.push({ icon: 'delete', label: t('workout.delete'), onClick: onDelete, destructive: true })

  return <Menu ariaLabel={t('workout.moreOptionsAria', { name: routineName })} items={items} />
}
