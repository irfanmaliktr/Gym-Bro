import { newId } from '../../lib/id'
import { db as defaultDatabase, type GymbroDatabase } from '../database'
import type { Equipment, ExerciseCatalogItem, ExerciseType, MuscleGroup } from '../types'

/**
 * Exercise library repository (EXER-001…003).
 *
 * EXER-003 splits the catalog into two classes with different rights:
 *  - built-in (`is_custom === false`): cannot be renamed or deleted, only hidden;
 *  - custom (`is_custom === true`): fully editable; deletable while unused in
 *    completed sessions, otherwise archived.
 */

/** Library display order: the PRD's muscle-group listing order. */
export const MUSCLE_ORDER: readonly MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

export interface ExerciseInput {
  name: string
  target_muscle: MuscleGroup
  secondary_muscles?: MuscleGroup[]
  equipment: Equipment
  type: ExerciseType
  instructions?: string
}

export type ExerciseValidationCode = 'name-required' | 'built-in-immutable'

export class ExerciseValidationError extends Error {
  readonly code: ExerciseValidationCode

  constructor(code: ExerciseValidationCode) {
    super(`exercise validation failed: ${code}`)
    this.name = 'ExerciseValidationError'
    this.code = code
  }
}

/** `'deleted'` — row removed; `'archived'` — kept because history references it. */
export type ExerciseDeleteOutcome = 'deleted' | 'archived'

export function compareExercises(a: ExerciseCatalogItem, b: ExerciseCatalogItem): number {
  const byMuscle = MUSCLE_ORDER.indexOf(a.target_muscle) - MUSCLE_ORDER.indexOf(b.target_muscle)
  if (byMuscle !== 0) return byMuscle
  return a.name.localeCompare(b.name)
}

export function normaliseExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function sanitiseSecondaryMuscles(
  muscles: readonly MuscleGroup[] | undefined,
  primary: MuscleGroup,
): MuscleGroup[] {
  if (!muscles) return []
  const valid = muscles.filter((muscle) => MUSCLE_ORDER.includes(muscle) && muscle !== primary)
  return MUSCLE_ORDER.filter((muscle) => valid.includes(muscle))
}

/** Active catalog by default; `includeArchived` powers the library's hidden list. */
export async function listExercises(
  options: { includeArchived?: boolean } = {},
  database: GymbroDatabase = defaultDatabase,
): Promise<ExerciseCatalogItem[]> {
  const all = await database.exercise_catalog.toArray()
  const visible = options.includeArchived ? all : all.filter((exercise) => !exercise.is_archived)
  return visible.sort(compareExercises)
}

export async function getExercise(
  id: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<ExerciseCatalogItem | null> {
  return (await database.exercise_catalog.get(id)) ?? null
}

export async function createExercise(
  input: ExerciseInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const name = normaliseExerciseName(input.name)
  if (name === '') throw new ExerciseValidationError('name-required')

  const id = newId()
  const exercise: ExerciseCatalogItem = {
    id,
    name,
    target_muscle: input.target_muscle,
    secondary_muscles: sanitiseSecondaryMuscles(input.secondary_muscles, input.target_muscle),
    equipment: input.equipment,
    type: input.type,
    instructions: input.instructions?.trim() ?? '',
    is_custom: true,
    is_archived: false,
  }

  await database.exercise_catalog.put(exercise)
  return id
}

/** EXER-003: built-ins are immutable, so this refuses to touch them. */
export async function updateExercise(
  id: string,
  input: ExerciseInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.exercise_catalog.get(id)
  if (!existing) throw new Error(`exercise not found: ${id}`)
  if (!existing.is_custom) throw new ExerciseValidationError('built-in-immutable')

  const name = normaliseExerciseName(input.name)
  if (name === '') throw new ExerciseValidationError('name-required')

  await database.exercise_catalog.put({
    ...existing,
    name,
    target_muscle: input.target_muscle,
    secondary_muscles: sanitiseSecondaryMuscles(input.secondary_muscles, input.target_muscle),
    equipment: input.equipment,
    type: input.type,
    instructions: input.instructions?.trim() ?? '',
  })
}

/** Hides/restores an exercise. Legal for built-ins and custom ones alike. */
export async function setExerciseArchived(
  id: string,
  archived: boolean,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.exercise_catalog.get(id)
  if (!existing) return
  await database.exercise_catalog.put({ ...existing, is_archived: archived })
}

/**
 * Whether any session exercise row points at this exercise.
 *
 * EXER-003 words this as "unused in completed sessions", but a session snapshot
 * is the only thing keeping a row meaningful for history, so the check is
 * deliberately conservative and covers sessions of *any* status — including one
 * still in progress that may complete later. Archiving is always permitted by
 * EXER-003, so this can only ever be stricter than the spec, never looser.
 */
export async function isReferencedInSessions(
  exerciseId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<boolean> {
  const usages = await database.session_exercises.where('exercise_id').equals(exerciseId).count()
  return usages > 0
}

/**
 * How many routine links point at this exercise — used by the delete
 * confirmation copy, and by `deleteExercise` to clean those links up so no
 * routine is left with a dangling reference.
 */
export async function countRoutineUsages(
  exerciseId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<number> {
  return database.routine_exercises.where('exercise_id').equals(exerciseId).count()
}

/**
 * Deletes a custom exercise, or degrades to archiving when history needs it.
 *
 * @throws {ExerciseValidationError} `built-in-immutable` for seeded exercises.
 */
export async function deleteExercise(
  id: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<ExerciseDeleteOutcome> {
  const existing = await database.exercise_catalog.get(id)
  if (!existing) throw new Error(`exercise not found: ${id}`)
  if (!existing.is_custom) throw new ExerciseValidationError('built-in-immutable')

  if (await isReferencedInSessions(id, database)) {
    await setExerciseArchived(id, true, database)
    return 'archived'
  }

  await database.transaction('rw', database.exercise_catalog, database.routine_exercises, async () => {
    await database.routine_exercises.where('exercise_id').equals(id).delete()
    await database.exercise_catalog.delete(id)
  })
  return 'deleted'
}
