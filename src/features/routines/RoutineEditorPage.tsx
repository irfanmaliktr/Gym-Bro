import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChipToggle } from '../../components/ui/ChipToggle'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../../data/AppDataContext'
import {
  DEFAULT_REST_SECONDS,
  REST_PRESETS,
  RoutineValidationError,
  type RoutineBundle,
  type RoutineInput,
} from '../../db'
import { useI18n } from '../../i18n'
import { formatWeight, parseDecimal, parseWeightInput } from '../../lib/units'
import { ISO_WEEKDAYS, weekdayNarrowLabel, type IsoWeekday } from '../../lib/week'
import { ExercisePickerModal } from './components/ExercisePickerModal'

/**
 * Draft row held in component state. Numbers are kept as *raw strings* so the
 * fields can be cleared and retyped naturally; they are parsed once on save and
 * clamped by the repository (`buildLinks`).
 */
interface DraftExercise {
  key: string
  exercise_id: string
  sets: string
  repsMin: string
  repsMax: string
  /** Written in the active display unit; `''` means "no weight target". */
  weight: string
  rest: string
  expanded: boolean
}

interface Draft {
  name: string
  description: string
  days: number[]
  exercises: DraftExercise[]
}

const DEFAULT_SETS = '3'
const DEFAULT_REPS_MIN = '8'
const DEFAULT_REPS_MAX = '12'

/**
 * Screen 4 — routine editor (ROUTINE-001…003, ROUTINE-004 via the list).
 *
 * Two structural notes:
 *  1. The reference draws a per-set "Target Sets Matrix" (Set 1/2/3 with their
 *     own weight and reps) for the first exercise, but PRD §8.2 `routine_exercises`
 *     stores exactly one target set count / rep range / weight / rest per
 *     exercise. The schema is authoritative, so the compact summary row the
 *     reference itself uses for cards 2–4 is used for every exercise, expanded
 *     into one editable target block.
 *  2. Reordering uses explicit move up/down buttons rather than the reference's
 *     drag handle: HTML5 drag-and-drop does not work on touch, and adding a
 *     drag library is not justified for a single-user list.
 *
 * The stats strip drops the reference's "Estimated Time ~52 Mins" (the PRD
 * defines no duration model) and reports counts that are real: exercises,
 * planned working sets and the muscles covered.
 */
export function RoutineEditorPage() {
  const { routineId } = useParams<{ routineId: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { routines, archivedRoutines, exercises: catalog, catalogById, unit, actions } = useAppData()
  const showToast = useToast()

  const existing = useMemo<RoutineBundle | null>(() => {
    if (!routineId) return null
    return [...routines, ...archivedRoutines].find((bundle) => bundle.routine.id === routineId) ?? null
  }, [routineId, routines, archivedRoutines])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [rows, setRows] = useState<DraftExercise[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  const keyCounter = useRef(0)
  const nextKey = () => {
    keyCounter.current += 1
    return `row-${keyCounter.current}`
  }

  const signatureOf = (draft: Draft) =>
    JSON.stringify({
      name: draft.name.trim(),
      description: draft.description.trim(),
      days: [...draft.days].sort((a, b) => a - b),
      exercises: draft.exercises.map((row) => ({
        id: row.exercise_id,
        sets: row.sets,
        min: row.repsMin,
        max: row.repsMax,
        weight: row.weight,
        rest: row.rest,
      })),
    })

  const buildDraft = (bundle: RoutineBundle | null): Draft => {
    if (!bundle) return { name: '', description: '', days: [], exercises: [] }
    return {
      name: bundle.routine.name,
      description: bundle.routine.description ?? '',
      days: [...bundle.routine.assigned_days],
      exercises: bundle.exercises.map((link) => ({
        key: nextKey(),
        exercise_id: link.exercise_id,
        sets: String(link.target_sets ?? 3),
        repsMin: String(link.target_reps_min ?? 8),
        repsMax: String(link.target_reps_max ?? 12),
        weight:
          link.target_weight_kg === undefined
            ? ''
            : formatWeight(link.target_weight_kg, unit, locale, { decimals: 1 }),
        rest: link.rest_seconds === undefined ? String(DEFAULT_REST_SECONDS) : String(link.rest_seconds),
        expanded: false,
      })),
    }
  }

  const initialSignature = useRef<string | null>(null)
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    const key = routineId ?? 'new'
    if (loadedFor.current === key) return
    // Wait until the requested routine is actually in the loaded snapshot.
    if (routineId && !existing) return

    const draft = buildDraft(existing)
    loadedFor.current = key
    initialSignature.current = signatureOf(draft)
    setName(draft.name)
    setDescription(draft.description)
    setDays(draft.days)
    setRows(draft.exercises)
    // buildDraft closes over `unit`/`locale`, which only matter for the initial
    // weight text; re-running on a language switch must not clobber edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, existing])

  const currentSignature = signatureOf({ name, description, days, exercises: rows })
  const dirty = initialSignature.current !== null && currentSignature !== initialSignature.current

  if (routineId && !existing) {
    return (
      <div className="min-h-screen bg-bg-canvas px-margin py-10 flex flex-col items-center justify-center gap-4">
        <Icon name="error_outline" className="text-status-error text-[32px]" />
        <p className="font-body-md text-body-md text-text-secondary text-center">
          {t('editor.notFound')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/workout', { replace: true })}
          className="min-h-[44px] px-4 rounded-lg bg-accent-neon text-text-on-accent font-body-bold text-body-bold"
        >
          {t('common.back')}
        </button>
      </div>
    )
  }

  const toggleDay = (day: IsoWeekday) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    )
  }

  const addExercise = (exerciseId: string) => {
    setRows((current) => [
      ...current.map((row) => ({ ...row, expanded: false })),
      {
        key: nextKey(),
        exercise_id: exerciseId,
        sets: DEFAULT_SETS,
        repsMin: DEFAULT_REPS_MIN,
        repsMax: DEFAULT_REPS_MAX,
        weight: '',
        rest: String(DEFAULT_REST_SECONDS),
        expanded: true,
      },
    ])
  }

  const updateRow = (key: string, patch: Partial<DraftExercise>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const expandRow = (key: string) => {
    setRows((current) => current.map((row) => ({ ...row, expanded: row.key === key })))
  }

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  const moveRow = (index: number, delta: number) => {
    setRows((current) => {
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const toNumber = (raw: string): number | undefined => {
    const parsed = parseDecimal(raw)
    return parsed === null ? undefined : parsed
  }

  const save = async () => {
    if (saving) return
    const trimmed = name.trim()
    if (trimmed === '') {
      setError(t('editor.nameRequired'))
      return
    }

    setSaving(true)
    setError(null)

    const input: RoutineInput = {
      name: trimmed,
      description: description.trim() === '' ? undefined : description.trim(),
      assigned_days: days,
      exercises: rows.map((row) => ({
        exercise_id: row.exercise_id,
        target_sets: toNumber(row.sets),
        target_reps_min: toNumber(row.repsMin),
        target_reps_max: toNumber(row.repsMax),
        target_weight_kg: parseWeightInput(row.weight, unit) ?? undefined,
        rest_seconds: toNumber(row.rest),
      })),
    }

    try {
      await actions.saveRoutine(routineId ?? null, input)
      showToast(t('editor.toastSaved', { name: trimmed }))
      navigate('/workout', { replace: true })
    } catch (caught) {
      console.error('[gymbro] routine could not be saved', caught)
      setSaving(false)
      if (caught instanceof RoutineValidationError) {
        setError(caught.code === 'name-required' ? t('editor.nameRequired') : t('editor.nameTaken'))
      } else {
        showToast(t('common.saveFailed'), 'info')
      }
    }
  }

  const leave = () => {
    if (dirty) setDiscardOpen(true)
    else navigate('/workout', { replace: true })
  }

  const addedIds = new Set(rows.map((row) => row.exercise_id))
  const parsedSets = rows.reduce((total, row) => total + (toNumber(row.sets) ?? 0), 0)
  const muscles = [
    ...new Set(
      rows
        .map((row) => catalogById.get(row.exercise_id)?.target_muscle)
        .filter((value): value is NonNullable<typeof value> => value !== undefined),
    ),
  ]

  return (
    <div className="min-h-screen bg-bg-canvas">
      <header className="sticky top-0 z-40 pt-safe bg-bg-secondary/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
        <div className="max-w-[1024px] mx-auto h-14 px-margin flex items-center gap-3">
          <button
            type="button"
            onClick={leave}
            aria-label={t('common.back')}
            className="w-11 h-11 -ml-2 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors shrink-0"
          >
            <Icon name="arrow_back" className="text-[22px]" />
          </button>
          <h1 className="font-title-md text-title-md text-text-primary tracking-tight truncate">
            {routineId ? t('editor.titleEdit') : t('editor.titleNew')}
          </h1>
        </div>
      </header>

      <main className="max-w-[1024px] mx-auto px-margin pt-5 pb-32 flex flex-col gap-space-lg">
        <section className="bg-surface-card rounded-xl p-4 shadow-md flex flex-col gap-4">
          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="routine-name"
              className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
            >
              {t('editor.nameLabel')}
            </label>
            <input
              id="routine-name"
              type="text"
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder={t('editor.namePlaceholder')}
              aria-invalid={error !== null}
              className="w-full bg-bg-canvas text-text-primary font-title-sm text-title-sm p-3 rounded-lg outline-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
            />
            {error ? (
              <p role="alert" className="font-body-sm text-body-sm text-status-error">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              {t('editor.daysLabel')}
            </span>
            <div className="flex items-center gap-1.5">
              {ISO_WEEKDAYS.map((day) => {
                const selected = days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={weekdayNarrowLabel(locale, day)}
                    onClick={() => toggleDay(day)}
                    className={`flex-1 min-h-[44px] rounded-lg font-body-bold text-body-bold transition-all ${
                      selected
                        ? 'bg-accent-neon text-text-on-accent shadow-[0_0_12px_rgba(182,255,0,0.25)]'
                        : 'bg-surface-card text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {weekdayNarrowLabel(locale, day)}
                  </button>
                )
              })}
            </div>
            <span className="font-label-sm text-label-sm text-text-secondary">
              {days.length === 0
                ? t('editor.daysNone')
                : t('editor.daysActive', { count: days.length })}
            </span>
          </div>

          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="routine-description"
              className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
            >
              {t('editor.descriptionLabel')}
            </label>
            <textarea
              id="routine-description"
              rows={2}
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('editor.descriptionPlaceholder')}
              className="w-full bg-surface-card text-text-primary font-body-sm text-body-sm p-3 rounded-lg outline-none resize-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-title-md text-title-md uppercase tracking-tight text-text-primary">
                {t('editor.exercisesTitle')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-elevated font-label-sm text-label-sm text-accent-neon font-body-bold">
                {rows.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-11 px-3 rounded-lg bg-surface-elevated text-text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors active:scale-95 hover:bg-surface-container-high"
            >
              <Icon name="add" className="text-accent-neon text-[18px]" />
              <span>{t('editor.addExercise')}</span>
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="bg-surface-card rounded-lg p-4 font-body-sm text-body-sm text-text-secondary">
              {t('editor.noExercises')}
            </p>
          ) : (
            <div className="flex flex-col gap-space-md">
              {rows.map((row, index) => (
                <ExerciseTargetCard
                  key={row.key}
                  row={row}
                  index={index}
                  total={rows.length}
                  exerciseName={catalogById.get(row.exercise_id)?.name ?? t('workout.unknownExercise')}
                  muscle={catalogById.get(row.exercise_id)?.target_muscle}
                  equipment={catalogById.get(row.exercise_id)?.equipment}
                  unit={unit}
                  locale={locale}
                  onChange={(patch) => updateRow(row.key, patch)}
                  onExpand={() => expandRow(row.key)}
                  onCollapse={() => updateRow(row.key, { expanded: false })}
                  onRemove={() => removeRow(row.key)}
                  onMove={(delta) => moveRow(index, delta)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full h-16 rounded-xl bg-surface-card hover:bg-surface-elevated active:scale-[0.99] transition-all flex items-center justify-center gap-3 group shadow-md"
          >
            <span className="w-9 h-9 rounded-full bg-accent-neon-dim flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="add" className="text-accent-neon text-[22px]" />
            </span>
            <span className="font-title-sm text-title-sm text-text-primary group-hover:text-accent-neon transition-colors">
              {t('editor.addAnother')}
            </span>
          </button>

          <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
            <Stat label={t('editor.statExercises')} value={String(rows.length)} />
            <span className="w-px h-8 bg-surface-container-high shrink-0" />
            <Stat label={t('editor.statWorkingSets')} value={String(parsedSets)} />
            <span className="w-px h-8 bg-surface-container-high shrink-0" />
            <Stat
              label={t('editor.statMuscles')}
              value={
                muscles.length === 0
                  ? '—'
                  : muscles.map((muscle) => t(`muscle.${muscle}`)).join(', ')
              }
              accent
            />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-xl px-margin py-3 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1024px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={leave}
            className="h-12 flex-1 rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container-high font-body-bold text-body-bold transition-all active:scale-95"
          >
            {t('editor.discard')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-12 flex-[2] rounded-lg bg-accent-neon hover:bg-accent-neon-hover text-text-on-accent font-body-bold text-body-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(182,255,0,0.3)] disabled:opacity-70"
          >
            <Icon name={saving ? 'progress_activity' : 'check_circle'} className={`text-[20px] ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? t('common.saving') : t('editor.save')}</span>
          </button>
        </div>
      </div>

      <ExercisePickerModal
        open={pickerOpen}
        exercises={catalog}
        addedIds={addedIds}
        onSelect={(exercise) => addExercise(exercise.id)}
        onClose={() => setPickerOpen(false)}
      />

      <ConfirmDialog
        open={discardOpen}
        title={t('editor.confirmDiscardTitle')}
        body={t('editor.confirmDiscardBody')}
        confirmLabel={t('editor.discard')}
        cancelLabel={t('editor.keepEditing')}
        destructive
        onConfirm={() => navigate('/workout', { replace: true })}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="font-label-sm text-label-sm text-text-secondary uppercase">{label}</span>
      <span
        className={`font-title-sm text-title-sm truncate ${accent ? 'text-accent-neon' : 'text-text-primary'}`}
      >
        {value}
      </span>
    </div>
  )
}

interface ExerciseTargetCardProps {
  row: DraftExercise
  index: number
  total: number
  exerciseName: string
  muscle?: string
  equipment?: string
  unit: 'kg' | 'lbs'
  locale: string
  onChange: (patch: Partial<DraftExercise>) => void
  onExpand: () => void
  onCollapse: () => void
  onRemove: () => void
  onMove: (delta: number) => void
}

function ExerciseTargetCard({
  row,
  index,
  total,
  exerciseName,
  muscle,
  equipment,
  unit,
  onChange,
  onExpand,
  onCollapse,
  onRemove,
  onMove,
}: ExerciseTargetCardProps) {
  const { t } = useI18n()
  const restValue = parseDecimal(row.rest)

  const summaryReps =
    row.repsMin.trim() === '' && row.repsMax.trim() === ''
      ? ''
      : row.repsMin === row.repsMax || row.repsMax.trim() === ''
        ? row.repsMin
        : `${row.repsMin}–${row.repsMax}`

  return (
    <div className="flex flex-col bg-surface-card rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              aria-label={t('editor.moveUp')}
              className="w-11 h-11 rounded flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <Icon name="keyboard_arrow_up" className="text-[20px]" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              aria-label={t('editor.moveDown')}
              className="w-11 h-11 rounded flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <Icon name="keyboard_arrow_down" className="text-[20px]" />
            </button>
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-title-sm text-title-sm text-text-primary truncate">{exerciseName}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {muscle ? (
                <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-label-sm text-label-sm text-text-secondary">
                  {t(`muscle.${muscle}`)}
                </span>
              ) : null}
              {equipment ? (
                <span className="px-1.5 py-0.5 rounded bg-surface-elevated font-label-sm text-label-sm text-text-secondary">
                  {t(`equipment.${equipment}`)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={row.expanded ? onCollapse : onExpand}
            aria-label={row.expanded ? t('editor.collapse') : t('editor.tune')}
            aria-expanded={row.expanded}
            className="w-11 h-11 rounded flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <Icon name={row.expanded ? 'expand_less' : 'tune'} className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('editor.removeExercise', { name: exerciseName })}
            className="w-11 h-11 rounded flex items-center justify-center text-status-error/80 hover:text-status-error transition-colors"
          >
            <Icon name="delete_outline" className="text-[18px]" />
          </button>
        </div>
      </div>

      {row.expanded ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              id={`${row.key}-sets`}
              label={t('editor.targetSets')}
              value={row.sets}
              onChange={(value) => onChange({ sets: value })}
            />
            <NumberField
              id={`${row.key}-reps-min`}
              label={t('editor.targetRepsMin')}
              value={row.repsMin}
              onChange={(value) => onChange({ repsMin: value })}
            />
            <NumberField
              id={`${row.key}-reps-max`}
              label={t('editor.targetRepsMax')}
              value={row.repsMax}
              onChange={(value) => onChange({ repsMax: value })}
            />
          </div>

          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor={`${row.key}-weight`}
              className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
            >
              {t('editor.targetWeight')}
            </label>
            <div className="relative flex items-center">
              <input
                id={`${row.key}-weight`}
                type="text"
                inputMode="decimal"
                value={row.weight}
                onChange={(event) => onChange({ weight: event.target.value })}
                placeholder={t('editor.weightPlaceholder')}
                className="w-full bg-surface-elevated text-text-primary font-numeric-input text-numeric-input text-center p-3 rounded-lg outline-none placeholder:text-text-secondary"
              />
              <span className="absolute right-3 font-label-sm text-label-sm text-text-secondary">
                {t(`unit.${unit}`)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              {t('editor.restLabel')}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {REST_PRESETS.map((preset) => (
                <ChipToggle
                  key={preset}
                  selected={restValue === preset}
                  onClick={() => onChange({ rest: String(preset) })}
                >
                  {t('editor.restSeconds', { seconds: preset })}
                </ChipToggle>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={t('editor.restCustom')}
                  value={row.rest}
                  onChange={(event) => onChange({ rest: event.target.value })}
                  className="w-20 bg-surface-elevated text-text-primary font-numeric-input text-numeric-input text-center p-2 rounded-lg outline-none"
                />
                <span className="font-label-sm text-label-sm text-text-secondary">
                  {t('editor.restCustom')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onExpand}
          className="mt-3 w-full flex items-center justify-between bg-surface-elevated hover:bg-surface-container-high rounded-lg p-2.5 transition-colors text-left"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-card text-accent-neon font-body-bold shrink-0">
              {t('editor.setsChip', { count: row.sets || '0' })}
            </span>
            <span className="font-body-sm text-body-sm text-text-primary font-numeric-input truncate">
              {row.weight.trim() === ''
                ? summaryReps === ''
                  ? t('editor.noTarget')
                  : t('editor.repsOnly', { reps: summaryReps })
                : t('editor.weightReps', {
                    weight: row.weight,
                    unit: t(`unit.${unit}`),
                    reps: summaryReps || '—',
                  })}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-text-secondary font-label-sm text-label-sm shrink-0">
            <Icon name="timer" className="text-accent-neon text-[16px]" />
            <span>{t('editor.restShort', { seconds: row.rest || '0' })}</span>
          </span>
        </button>
      )}
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-space-xs min-w-0">
      <label htmlFor={id} className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary truncate">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-surface-elevated text-text-primary font-numeric-input text-numeric-input text-center p-3 rounded-lg outline-none"
      />
    </div>
  )
}
