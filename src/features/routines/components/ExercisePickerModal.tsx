import { useEffect, useMemo, useState } from 'react'
import { ChipToggle } from '../../../components/ui/ChipToggle'
import { Icon } from '../../../components/ui/Icon'
import { Modal, ModalHeader } from '../../../components/ui/Modal'
import { MUSCLE_ORDER, type ExerciseCatalogItem, type MuscleGroup } from '../../../db'
import { useI18n } from '../../../i18n'
import { ExerciseFormModal } from '../../workout/components/ExerciseFormModal'
import { useToast } from '../../../components/ui/Toast'

interface ExercisePickerModalProps {
  open: boolean
  /** Active (non-archived) catalog. */
  exercises: readonly ExerciseCatalogItem[]
  /** Ids already present in the routine — listed as added to avoid duplicates. */
  addedIds: ReadonlySet<string>
  onSelect: (exercise: ExerciseCatalogItem) => void
  onClose: () => void
}

/**
 * "Add Exercise" picker for the routine editor (ROUTINE-002).
 */
export function ExercisePickerModal({
  open,
  exercises,
  addedIds,
  onSelect,
  onClose,
}: ExercisePickerModalProps) {
  const { t } = useI18n()
  const showToast = useToast()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setQuery('')
      setMuscle('all')
    }
  }, [open])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return exercises.filter((exercise) => {
      if (muscle !== 'all' && exercise.target_muscle !== muscle) return false
      if (needle === '') return true
      return exercise.name.toLocaleLowerCase().includes(needle)
    })
  }, [exercises, query, muscle])

  const toggleExercise = (exercise: ExerciseCatalogItem) => {
    if (addedIds.has(exercise.id)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(exercise.id)) {
        next.delete(exercise.id)
      } else {
        next.add(exercise.id)
      }
      return next
    })
  }

  const confirm = () => {
    const toAdd = exercises.filter((ex) => selected.has(ex.id) && !addedIds.has(ex.id))
    for (const ex of toAdd) {
      onSelect(ex)
    }
    setSelected(new Set())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="md:max-w-lg"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary font-body-bold text-body-bold transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={selected.size === 0}
            className="flex-[2] min-h-[44px] rounded-lg bg-accent-neon text-text-on-accent hover:bg-accent-neon-hover font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.done')}
          </button>
        </div>
      }
    >
      <ModalHeader title={t('editor.pickerTitle')} onClose={onClose} />

      <div className="relative">
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
          className="w-full bg-bg-canvas text-text-primary font-body-sm text-body-sm pl-10 pr-3 py-3 rounded-lg outline-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth no-scrollbar min-h-[44px]">
        <ChipToggle selected={muscle === 'all'} onClick={() => setMuscle('all')}>
          {t('library.allMuscles')}
        </ChipToggle>
        {MUSCLE_ORDER.map((value) => (
          <ChipToggle key={value} selected={muscle === value} onClick={() => setMuscle(value)}>
            {t(`muscle.${value}`)}
          </ChipToggle>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="w-full min-h-[44px] px-3 rounded-lg bg-surface-elevated hover:bg-surface-container-high text-text-primary font-body-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Icon name="add" className="text-accent-neon text-[18px]" />
        <span>{t('library.newExercise')}</span>
      </button>

      {filtered.length === 0 ? (
        <p className="font-body-sm text-body-sm text-text-secondary py-6 text-center">
          {t('library.noResults')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((exercise) => {
            const added = addedIds.has(exercise.id)
            const isSelected = selected.has(exercise.id)
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => toggleExercise(exercise)}
                  className={`w-full min-h-[56px] px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-left transition-colors ${
                    added
                      ? 'bg-surface-container text-text-secondary cursor-default'
                      : isSelected
                        ? 'bg-accent-neon-dim/30 border border-accent-neon/50'
                        : 'bg-surface-elevated hover:bg-surface-container-high active:scale-[0.99]'
                  }`}
                >
                  <span className="flex flex-col gap-1 min-w-0">
                    <span className={`font-body-bold text-body-bold truncate ${added ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {exercise.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-card font-label-sm text-label-sm text-text-secondary">
                        {t(`muscle.${exercise.target_muscle}`)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-card font-label-sm text-label-sm text-text-secondary">
                        {t(`equipment.${exercise.equipment}`)}
                      </span>
                      {exercise.is_custom ? (
                        <span className="px-1.5 py-0.5 rounded bg-accent-neon/15 font-label-sm text-label-sm text-accent-neon">
                          {t('library.customBadge')}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <Icon
                    name={added ? 'check_circle' : isSelected ? 'check_circle' : 'add_circle'}
                    fill={added || isSelected}
                    className={`text-[22px] shrink-0 ${added || isSelected ? 'text-accent-neon' : 'text-text-secondary'}`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ExerciseFormModal
        open={formOpen}
        exercise={null}
        onClose={() => setFormOpen(false)}
        onSaved={(name, created) => {
          setFormOpen(false)
          showToast(t(created ? 'library.toastCreated' : 'library.toastUpdated', { name }))
        }}
      />
    </Modal>
  )
}
