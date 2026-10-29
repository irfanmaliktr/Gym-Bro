import { useEffect, useState } from 'react'
import { ChipToggle } from '../../../components/ui/ChipToggle'
import { Modal, ModalHeader } from '../../../components/ui/Modal'
import { useAppData } from '../../../data/AppDataContext'
import {
  ExerciseValidationError,
  MUSCLE_ORDER,
  type Equipment,
  type ExerciseCatalogItem,
  type ExerciseType,
  type MuscleGroup,
} from '../../../db'
import { useI18n } from '../../../i18n'

/** EXER-002: exactly the equipment types the PRD allows for custom exercises. */
const EQUIPMENT_OPTIONS: readonly Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'weighted_bodyweight',
]

const TYPE_OPTIONS: readonly ExerciseType[] = ['weight_reps', 'bodyweight_reps', 'assisted_weight']

interface ExerciseFormModalProps {
  open: boolean
  /** `null` creates a new custom exercise; otherwise that row is edited. */
  exercise: ExerciseCatalogItem | null
  onClose: () => void
  onSaved: (name: string, created: boolean) => void
}

/**
 * Create/edit form for custom exercises (EXER-002, EXER-003).
 * Built-in rows never reach this dialog — they are immutable, so the library
 * only offers hide/restore for them.
 */
export function ExerciseFormModal({ open, exercise, onClose, onSaved }: ExerciseFormModalProps) {
  const { t } = useI18n()
  const { actions } = useAppData()

  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>('chest')
  const [secondary, setSecondary] = useState<MuscleGroup[]>([])
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [type, setType] = useState<ExerciseType>('weight_reps')
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(exercise?.name ?? '')
    setMuscle(exercise?.target_muscle ?? 'chest')
    setSecondary(exercise?.secondary_muscles ?? [])
    setEquipment(exercise?.equipment ?? 'barbell')
    setType(exercise?.type ?? 'weight_reps')
    setInstructions(exercise?.instructions ?? '')
    setError(null)
    setSaving(false)
  }, [open, exercise])

  const toggleSecondary = (value: MuscleGroup) => {
    setSecondary((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  const submit = async () => {
    if (saving) return
    const trimmed = name.trim()
    if (trimmed === '') {
      setError(t('library.nameRequired'))
      return
    }

    setSaving(true)
    try {
      await actions.saveExercise(exercise?.id ?? null, {
        name: trimmed,
        target_muscle: muscle,
        secondary_muscles: secondary,
        equipment,
        type,
        instructions,
      })
      onSaved(trimmed, exercise === null)
    } catch (caught) {
      console.error('[gymbro] exercise could not be saved', caught)
      setSaving(false)
      setError(
        caught instanceof ExerciseValidationError && caught.code === 'name-required'
          ? t('library.nameRequired')
          : t('common.saveFailed'),
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      className="md:max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container-high font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-lg bg-accent-neon text-text-on-accent hover:bg-accent-neon-hover font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <ModalHeader
        title={exercise ? t('library.editExercise') : t('library.newExercise')}
        onClose={() => (saving ? undefined : onClose())}
      />

      <div className="flex flex-col gap-space-xs">
        <label
          htmlFor="exercise-name"
          className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
        >
          {t('library.fieldName')}
        </label>
        <input
          id="exercise-name"
          type="text"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('library.fieldNamePlaceholder')}
          className="w-full bg-bg-canvas text-text-primary font-body-md text-body-md p-3 rounded-lg outline-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
        />
      </div>

      <div className="flex flex-col gap-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          {t('library.fieldMuscle')}
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('library.fieldMuscle')}>
          {MUSCLE_ORDER.map((value) => (
            <ChipToggle
              key={value}
              selected={muscle === value}
              onClick={() => {
                setMuscle(value)
                setSecondary((current) => current.filter((item) => item !== value))
              }}
            >
              {t(`muscle.${value}`)}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          {t('library.fieldSecondary')}
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('library.fieldSecondary')}>
          {MUSCLE_ORDER.filter((value) => value !== muscle).map((value) => (
            <ChipToggle
              key={value}
              selected={secondary.includes(value)}
              onClick={() => toggleSecondary(value)}
            >
              {t(`muscle.${value}`)}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-space-xs">
          <label
            htmlFor="exercise-equipment"
            className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
          >
            {t('library.fieldEquipment')}
          </label>
          <select
            id="exercise-equipment"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value as Equipment)}
            className="w-full bg-bg-canvas text-text-primary font-body-sm text-body-sm p-3 rounded-lg outline-none"
          >
            {EQUIPMENT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`equipment.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label
            htmlFor="exercise-type"
            className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
          >
            {t('library.fieldType')}
          </label>
          <select
            id="exercise-type"
            value={type}
            onChange={(event) => setType(event.target.value as ExerciseType)}
            className="w-full bg-bg-canvas text-text-primary font-body-sm text-body-sm p-3 rounded-lg outline-none"
          >
            {TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`exerciseType.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-space-xs">
        <label
          htmlFor="exercise-instructions"
          className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
        >
          {t('library.fieldInstructions')}
        </label>
        <textarea
          id="exercise-instructions"
          rows={3}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder={t('library.fieldInstructionsPlaceholder')}
          className="w-full bg-bg-canvas text-text-primary font-body-sm text-body-sm p-3 rounded-lg outline-none resize-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
        />
      </div>

      {error ? (
        <p role="alert" className="font-body-sm text-body-sm text-status-error">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
