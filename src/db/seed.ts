import type { GymbroDatabase } from './database'
import { SEEDED_EXERCISES } from './exercises.seed'

/**
 * Idempotent seeding of the built-in exercise catalog (EXER-001).
 *
 * Design rules:
 *  - Only *missing* ids are inserted, so calling this on every app start is
 *    cheap and safe.
 *  - Existing rows are never overwritten: EXER-003 lets users archive/hide a
 *    built-in exercise, and a re-seed must not silently un-hide it.
 *  - New built-ins added in future versions are picked up automatically
 *    because the check is per id, not "is the table empty".
 *
 * @returns the number of rows actually inserted (0 when already complete).
 */
export async function seedExerciseCatalog(db: GymbroDatabase): Promise<number> {
  const knownIds = new Set(await db.exercise_catalog.toCollection().primaryKeys())
  const missing = SEEDED_EXERCISES.filter((exercise) => !knownIds.has(exercise.id))

  if (missing.length === 0) return 0

  await db.exercise_catalog.bulkAdd(missing)
  return missing.length
}
