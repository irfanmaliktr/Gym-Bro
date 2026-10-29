import { MUSCLE_ORDER } from '../db/repositories/exercises'
import type { ExerciseCatalogItem, MuscleGroup, RoutineExercise } from '../db/types'

/**
 * Derived, *real* routine figures for the routine cards (Screen 3) and the
 * editor footer (Screen 4).
 *
 * The Stitch references also show an "~52m" estimated duration and
 * "+2.5 kg overload ready" / "Best: 100 kg × 5" footers. The PRD defines no
 * duration formula and no overload heuristic, and PR history needs a logged
 * session, so those are not invented here — only values that can be counted
 * from stored routine data are surfaced.
 */
export interface RoutineSummary {
  exerciseCount: number
  /** Sum of `target_sets` across the routine's exercises. */
  workingSets: number
  /** Distinct primary muscles, in the catalog's listing order. */
  muscleGroups: MuscleGroup[]
}

export function summariseRoutine(
  links: readonly RoutineExercise[],
  catalogById: ReadonlyMap<string, ExerciseCatalogItem>,
): RoutineSummary {
  const muscles = new Set<MuscleGroup>()
  let workingSets = 0

  for (const link of links) {
    if (Number.isFinite(link.target_sets)) workingSets += link.target_sets as number
    const exercise = catalogById.get(link.exercise_id)
    if (exercise) muscles.add(exercise.target_muscle)
  }

  return {
    exerciseCount: links.length,
    workingSets,
    muscleGroups: MUSCLE_ORDER.filter((muscle) => muscles.has(muscle)),
  }
}

/**
 * "5–8" for a rep range, "10" when min and max agree, "" when the link carries
 * no targets at all (possible for rows written outside the editor).
 */
export function formatRepTarget(link: RoutineExercise): string {
  const min = link.target_reps_min
  const max = link.target_reps_max
  if (min === undefined && max === undefined) return ''
  if (min === undefined) return `${max}`
  if (max === undefined || min === max) return `${min}`
  return `${min}–${max}`
}
