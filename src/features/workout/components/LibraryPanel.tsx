import { useMemo, useState } from 'react'
import { ChipToggle } from '../../../components/ui/ChipToggle'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Icon } from '../../../components/ui/Icon'
import { Menu, type MenuItemSpec } from '../../../components/ui/Menu'
import { useToast } from '../../../components/ui/Toast'
import { useAppData } from '../../../data/AppDataContext'
import { countRoutineUsages, MUSCLE_ORDER, type ExerciseCatalogItem, type MuscleGroup } from '../../../db'
import { useI18n } from '../../../i18n'
import { ExerciseFormModal } from './ExerciseFormModal'

/**
 * "Library" tab of Screen 3 — the exercise catalog (EXER-001…003).
 *
 * Search + muscle filter run over the already-loaded catalog (45 rows), which
 * keeps typing instant and avoids an IndexedDB round-trip per keystroke.
 * Built-in rows expose hide/restore only; custom rows can also be edited and
 * deleted, with history-linked rows degrading to archived (EXER-003).
 */
export function LibraryPanel() {
  const { t } = useI18n()
  const { exercises, archivedExercises, actions } = useAppData()
  const showToast = useToast()

  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExerciseCatalogItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ExerciseCatalogItem | null>(null)
  const [deleteUsage, setDeleteUsage] = useState(0)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return exercises.filter((exercise) => {
      if (muscle !== 'all' && exercise.target_muscle !== muscle) return false
      if (needle === '') return true
      return exercise.name.toLocaleLowerCase().includes(needle)
    })
  }, [exercises, query, muscle])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (exercise: ExerciseCatalogItem) => {
    setEditing(exercise)
    setFormOpen(true)
  }

  const requestDelete = (exercise: ExerciseCatalogItem) => {
    setPendingDelete(exercise)
    setDeleteUsage(0)
    void countRoutineUsages(exercise.id)
      .then(setDeleteUsage)
      .catch((error: unknown) => console.error('[gymbro] could not count routine usages', error))
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      const outcome = await actions.deleteExerciseById(pendingDelete.id)
      showToast(
        outcome === 'deleted'
          ? t('library.toastDeleted', { name: pendingDelete.name })
          : t('library.toastArchived', { name: pendingDelete.name }),
        outcome === 'deleted' ? 'success' : 'info',
      )
      setPendingDelete(null)
    } catch (error) {
      console.error('[gymbro] exercise could not be deleted', error)
      showToast(t('common.saveFailed'), 'info')
    } finally {
      setBusy(false)
    }
  }

  const setArchived = async (exercise: ExerciseCatalogItem, archived: boolean) => {
    try {
      await actions.setExerciseArchivedById(exercise.id, archived)
      showToast(
        archived
          ? t('library.toastHidden', { name: exercise.name })
          : t('library.toastRestored', { name: exercise.name }),
      )
    } catch (error) {
      console.error('[gymbro] exercise could not be updated', error)
      showToast(t('common.saveFailed'), 'info')
    }
  }

  const menuItemsFor = (exercise: ExerciseCatalogItem): MenuItemSpec[] => {
    const items: MenuItemSpec[] = []
    if (exercise.is_custom) {
      items.push({ icon: 'edit', label: t('library.editExercise'), onClick: () => openEdit(exercise) })
    }
    items.push({
      icon: 'visibility_off',
      label: t('library.hide'),
      onClick: () => void setArchived(exercise, true),
    })
    if (exercise.is_custom) {
      items.push({
        icon: 'delete',
        label: t('library.delete'),
        onClick: () => requestDelete(exercise),
        destructive: true,
      })
    }
    return items
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[20px]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('library.searchPlaceholder')}
            aria-label={t('library.searchPlaceholder')}
            className="w-full bg-surface-card text-text-primary font-body-sm text-body-sm pl-10 pr-3 py-3 rounded-lg outline-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-11 shrink-0 px-3 rounded-lg bg-surface-elevated text-text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors active:scale-95 hover:bg-surface-container-high"
        >
          <Icon name="add" className="text-accent-neon text-[18px]" />
          <span>{t('library.newExercise')}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin scroll-smooth no-scrollbar">
        <ChipToggle selected={muscle === 'all'} onClick={() => setMuscle('all')}>
          {t('library.allMuscles')}
        </ChipToggle>
        {MUSCLE_ORDER.map((value) => (
          <ChipToggle key={value} selected={muscle === value} onClick={() => setMuscle(value)}>
            {t(`muscle.${value}`)}
          </ChipToggle>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="font-body-sm text-body-sm text-text-secondary py-6 text-center">
          {t('library.noResults')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} menuItems={menuItemsFor(exercise)} />
          ))}
        </div>
      )}

      {/* Built-ins are immutable by EXER-003 — explained once, not badged per row. */}
      <p className="font-label-sm text-label-sm text-text-secondary flex items-start gap-1.5">
        <Icon name="info" className="text-[14px] shrink-0 mt-0.5" />
        <span>{t('library.builtInNote')}</span>
      </p>

      {archivedExercises.length > 0 ? (
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            aria-expanded={showArchived}
            className="min-h-[44px] flex items-center justify-between gap-2 font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>{t('library.archivedSection', { count: archivedExercises.length })}</span>
            <Icon name={showArchived ? 'expand_less' : 'expand_more'} className="text-[20px]" />
          </button>

          {showArchived ? (
            <div className="flex flex-col gap-2">
              {archivedExercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  archived
                  menuItems={[
                    {
                      icon: 'restore',
                      label: t('library.restore'),
                      onClick: () => void setArchived(exercise, false),
                    },
                  ]}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ExerciseFormModal
        open={formOpen}
        exercise={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(name, created) => {
          setFormOpen(false)
          showToast(
            created
              ? t('library.toastCreated', { name })
              : t('library.toastUpdated', { name }),
          )
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('library.confirmDeleteTitle', { name: pendingDelete?.name ?? '' })}
        body={
          deleteUsage > 0
            ? t('library.confirmDeleteInRoutines', { count: deleteUsage })
            : t('library.confirmDeleteBody')
        }
        confirmLabel={t('library.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function ExerciseRow({
  exercise,
  menuItems,
  archived = false,
}: {
  exercise: ExerciseCatalogItem
  menuItems: MenuItemSpec[]
  archived?: boolean
}) {
  const { t } = useI18n()

  return (
    <div className="bg-surface-card rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-title-sm text-title-sm text-text-primary truncate">{exercise.name}</h3>
          {exercise.is_custom && !archived ? (
            <span className="font-label-sm text-label-sm bg-accent-neon-dim text-accent-neon px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0">
              {t('library.customBadge')}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-label-sm text-label-sm text-text-secondary">
            {t(`muscle.${exercise.target_muscle}`)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-label-sm text-label-sm text-text-secondary">
            {t(`equipment.${exercise.equipment}`)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-label-sm text-label-sm text-text-secondary">
            {t(`exerciseType.${exercise.type}`)}
          </span>
        </div>
      </div>
      <Menu ariaLabel={t('library.moreOptionsAria', { name: exercise.name })} items={menuItems} />
    </div>
  )
}
