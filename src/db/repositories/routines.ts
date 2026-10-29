import { newId } from '../../lib/id'
import { db as defaultDatabase, type GymbroDatabase } from '../database'
import type { RoutineExercise, UserRoutine } from '../types'

/**
 * Routine repository (ROUTINE-001…007).
 *
 * ROUTINE-007 is the load-bearing rule of this module: routine writes touch
 * **only** `user_routines` and `routine_exercises`. Completed workouts live in
 * `workout_sessions` / `session_exercises` / `set_logs`, which hold their own
 * name/equipment snapshots (§9), so editing or deleting a template can never
 * rewrite history.
 */

/** Design default for `rest_seconds` (PRD leaves it optional). */
export const DEFAULT_REST_SECONDS = 90
/** Rest chips offered in the routine editor, in seconds. */
export const REST_PRESETS: readonly number[] = [60, 90, 120, 180]

const DEFAULT_TARGET_SETS = 3
const DEFAULT_REPS_MIN = 8
const DEFAULT_REPS_MAX = 12

export interface RoutineExerciseDraft {
  exercise_id: string
  target_sets?: number
  target_reps_min?: number
  target_reps_max?: number
  /** Kilograms — the editor converts from the active display unit first. */
  target_weight_kg?: number
  rest_seconds?: number
  notes?: string
}

export interface RoutineInput {
  name: string
  description?: string
  /** ISO weekdays 1–7 (ROUTINE-006); invalid entries are dropped. */
  assigned_days?: number[]
  exercises?: RoutineExerciseDraft[]
}

export interface RoutineBundle {
  routine: UserRoutine
  /** Ordered by `display_order`. */
  exercises: RoutineExercise[]
}

export type RoutineValidationCode = 'name-required' | 'name-taken'

export class RoutineValidationError extends Error {
  readonly code: RoutineValidationCode

  constructor(code: RoutineValidationCode) {
    super(`routine validation failed: ${code}`)
    this.name = 'RoutineValidationError'
    this.code = code
  }
}

export function normaliseRoutineName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Case-insensitive comparison of two routine titles. */
export function isSameRoutineName(a: string, b: string): boolean {
  return normaliseRoutineName(a).toLocaleLowerCase() === normaliseRoutineName(b).toLocaleLowerCase()
}

/** Keeps only real ISO weekdays, de-duplicated and ascending (ROUTINE-006). */
export function sanitiseAssignedDays(days: readonly number[] | undefined): number[] {
  if (!days || days.length === 0) return []
  const valid = days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  return [...new Set(valid)].sort((a, b) => a - b)
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function buildLinks(routineId: string, drafts: readonly RoutineExerciseDraft[]): RoutineExercise[] {
  return drafts.map((draft, index) => {
    const repsMin = clampInt(draft.target_reps_min, DEFAULT_REPS_MIN, 1, 999)
    const repsMax = clampInt(draft.target_reps_max, DEFAULT_REPS_MAX, repsMin, 999)

    const link: RoutineExercise = {
      id: newId(),
      routine_id: routineId,
      exercise_id: draft.exercise_id,
      display_order: index,
      target_sets: clampInt(draft.target_sets, DEFAULT_TARGET_SETS, 1, 99),
      target_reps_min: repsMin,
      target_reps_max: repsMax,
    }

    // Optional fields are omitted rather than stored as `undefined`/0 so the
    // backup JSON stays clean and "no target" is distinguishable from "0 kg".
    if (draft.target_weight_kg !== undefined && Number.isFinite(draft.target_weight_kg) && draft.target_weight_kg > 0) {
      link.target_weight_kg = draft.target_weight_kg
    }
    if (draft.rest_seconds !== undefined && Number.isFinite(draft.rest_seconds) && draft.rest_seconds >= 0) {
      link.rest_seconds = Math.round(draft.rest_seconds)
    }
    const notes = draft.notes?.trim()
    if (notes) link.notes = notes

    return link
  })
}

/**
 * Every routine, newest edit first, each with its ordered exercise links.
 *
 * `is_archived` is a boolean, which IndexedDB cannot index, so archiving is
 * filtered in memory (see the platform note in `database.ts`).
 */
export async function listRoutineBundles(
  options: { includeArchived?: boolean } = {},
  database: GymbroDatabase = defaultDatabase,
): Promise<RoutineBundle[]> {
  const routines = await database.user_routines.orderBy('updated_at').reverse().toArray()
  const visible = options.includeArchived ? routines : routines.filter((routine) => !routine.is_archived)

  const links = await database.routine_exercises.toArray()
  const byRoutine = new Map<string, RoutineExercise[]>()
  for (const link of links) {
    const bucket = byRoutine.get(link.routine_id)
    if (bucket) bucket.push(link)
    else byRoutine.set(link.routine_id, [link])
  }

  return visible.map((routine) => ({
    routine,
    exercises: (byRoutine.get(routine.id) ?? []).sort((a, b) => a.display_order - b.display_order),
  }))
}

export async function getRoutineBundle(
  id: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<RoutineBundle | null> {
  const routine = await database.user_routines.get(id)
  if (!routine) return null
  const exercises = await database.routine_exercises.where('routine_id').equals(id).toArray()
  exercises.sort((a, b) => a.display_order - b.display_order)
  return { routine, exercises }
}

/**
 * ROUTINE-001 requires a *unique* title. Archived routines are included in the
 * check so restoring one can never produce two routines sharing a name.
 */
export async function isRoutineNameTaken(
  name: string,
  excludeId?: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<boolean> {
  const routines = await database.user_routines.toArray()
  return routines.some((routine) => routine.id !== excludeId && isSameRoutineName(routine.name, name))
}

async function assertUsableName(
  name: string,
  excludeId: string | undefined,
  database: GymbroDatabase,
): Promise<string> {
  const normalised = normaliseRoutineName(name)
  if (normalised === '') throw new RoutineValidationError('name-required')
  if (await isRoutineNameTaken(normalised, excludeId, database)) {
    throw new RoutineValidationError('name-taken')
  }
  return normalised
}

export async function createRoutine(
  input: RoutineInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const name = await assertUsableName(input.name, undefined, database)
  const now = Date.now()
  const id = newId()

  const routine: UserRoutine = {
    id,
    name,
    assigned_days: sanitiseAssignedDays(input.assigned_days),
    is_archived: false,
    created_at: now,
    updated_at: now,
  }
  const description = input.description?.trim()
  if (description) routine.description = description

  const links = buildLinks(id, input.exercises ?? [])

  await database.transaction('rw', database.user_routines, database.routine_exercises, async () => {
    await database.user_routines.put(routine)
    if (links.length > 0) await database.routine_exercises.bulkPut(links)
  })

  return id
}

/**
 * Replaces name/description/days and rewrites the exercise links wholesale.
 * `created_at` and `is_archived` are preserved; link ids are regenerated
 * because nothing outside this table references them.
 */
export async function updateRoutine(
  id: string,
  input: RoutineInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.user_routines.get(id)
  if (!existing) throw new Error(`routine not found: ${id}`)

  const name = await assertUsableName(input.name, id, database)
  const description = input.description?.trim()

  const updated: UserRoutine = {
    ...existing,
    name,
    assigned_days: sanitiseAssignedDays(input.assigned_days),
    updated_at: Date.now(),
  }
  if (description) updated.description = description
  else delete updated.description

  const links = buildLinks(id, input.exercises ?? [])

  await database.transaction('rw', database.user_routines, database.routine_exercises, async () => {
    await database.user_routines.put(updated)
    await database.routine_exercises.where('routine_id').equals(id).delete()
    if (links.length > 0) await database.routine_exercises.bulkPut(links)
  })
}

/**
 * Soft delete / restore (ROUTINE-005). Archiving is a visibility flag rather
 * than a content edit, so `updated_at` is deliberately left alone — a restored
 * routine returns to its original position in the list.
 */
export async function setRoutineArchived(
  id: string,
  archived: boolean,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.user_routines.get(id)
  if (!existing) return
  await database.user_routines.put({ ...existing, is_archived: archived })
}

/** Permanent delete + its links (ROUTINE-005). Sessions are never touched. */
export async function deleteRoutine(
  id: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await database.transaction('rw', database.user_routines, database.routine_exercises, async () => {
    await database.user_routines.delete(id)
    await database.routine_exercises.where('routine_id').equals(id).delete()
  })
}

/**
 * ROUTINE-004. The copy is always active, always gets a fresh id, and always
 * lands on a free title (`Push Day (copy)`, `Push Day (copy 2)`, …).
 *
 * @param options.copyLabel localized "copy" word supplied by the UI.
 */
export async function duplicateRoutine(
  id: string,
  options: { copyLabel?: string } = {},
  database: GymbroDatabase = defaultDatabase,
): Promise<string | null> {
  const bundle = await getRoutineBundle(id, database)
  if (!bundle) return null

  const copyLabel = options.copyLabel?.trim() || 'copy'
  const name = await nextAvailableRoutineName(bundle.routine.name, copyLabel, database)

  const now = Date.now()
  const newRoutineId = newId()
  const routine: UserRoutine = {
    id: newRoutineId,
    name,
    assigned_days: [...bundle.routine.assigned_days],
    is_archived: false,
    created_at: now,
    updated_at: now,
  }
  if (bundle.routine.description) routine.description = bundle.routine.description

  const links: RoutineExercise[] = bundle.exercises.map((link, index) => ({
    ...link,
    id: newId(),
    routine_id: newRoutineId,
    display_order: index,
  }))

  await database.transaction('rw', database.user_routines, database.routine_exercises, async () => {
    await database.user_routines.put(routine)
    if (links.length > 0) await database.routine_exercises.bulkPut(links)
  })

  return newRoutineId
}

async function nextAvailableRoutineName(
  base: string,
  copyLabel: string,
  database: GymbroDatabase,
): Promise<string> {
  const taken = new Set(
    (await database.user_routines.toArray()).map((routine) => normaliseRoutineName(routine.name).toLocaleLowerCase()),
  )

  let counter = 1
  let candidate = `${base} (${copyLabel})`
  while (taken.has(candidate.toLocaleLowerCase())) {
    counter += 1
    candidate = `${base} (${copyLabel} ${counter})`
  }
  return candidate
}
