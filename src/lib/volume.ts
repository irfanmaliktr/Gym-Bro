import type { ExerciseType, SetType } from '../db/types'

/**
 * Volume math (LOG-010, PROG-003, PROG-004).
 *
 * Volume is expressed in kg·reps (or plain reps for unloaded bodyweight work)
 * and is always derived, never stored, so it can be recomputed after a
 * historical edit (HIST-005).
 */

/**
 * Structural subset of `SetLog` the volume math needs. Accepting a partial
 * shape lets the active-workout screen reuse these helpers on draft rows that
 * have not been persisted yet.
 */
export interface VolumeSetLike {
  weight_kg?: number | null
  reps?: number | null
  is_completed?: boolean
  set_type?: SetType
}

/** A set only contributes once the user explicitly completed it (LOG-004). */
export function isCountedSet(set: VolumeSetLike): boolean {
  return (
    set.is_completed === true &&
    typeof set.reps === 'number' &&
    Number.isFinite(set.reps) &&
    set.reps > 0
  )
}

export function countCompletedSets(sets: readonly VolumeSetLike[]): number {
  return sets.reduce((total, set) => total + (isCountedSet(set) ? 1 : 0), 0)
}

/**
 * Volume of a single completed set.
 *
 * - `weight_reps` / `assisted_weight`: `weight × reps`.
 * - `bodyweight_reps` with no added load: `reps` (PROG-004 — volume is carried
 *   purely by repetitions, because bodyweight itself is not logged per set).
 * - `bodyweight_reps` with added load: `added load × reps` (PROG-004's "added
 *   load delta").
 */
export function setVolume(set: VolumeSetLike, type: ExerciseType = 'weight_reps'): number {
  if (!isCountedSet(set)) return 0

  const reps = set.reps as number
  const weight =
    typeof set.weight_kg === 'number' && Number.isFinite(set.weight_kg)
      ? Math.max(0, set.weight_kg)
      : 0

  if (type === 'bodyweight_reps' && weight === 0) return reps

  return weight * reps
}

export interface VolumeOptions {
  /**
   * Whether warmup sets count (LOG-006).
   * `true` (default) matches LOG-010's plain "total volume"; pass `false` for
   * PROG-003's "Total Working Volume" series.
   */
  includeWarmups?: boolean
}

function countsTowardVolume(set: VolumeSetLike, options: VolumeOptions): boolean {
  if (!isCountedSet(set)) return false
  if (options.includeWarmups === false && set.set_type === 'warmup') return false
  return true
}

/**
 * Total volume of a list of sets belonging to one exercise.
 * The exercise `type` matters only for bodyweight movements (PROG-004).
 */
export function totalVolume(
  sets: readonly VolumeSetLike[],
  type: ExerciseType = 'weight_reps',
  options: VolumeOptions = {},
): number {
  return sets.reduce(
    (total, set) => total + (countsTowardVolume(set, options) ? setVolume(set, type) : 0),
    0,
  )
}

/**
 * Working volume — completed sets excluding warmups, i.e. the series plotted by
 * the Progress tab (PROG-003).
 */
export function workingVolume(
  sets: readonly VolumeSetLike[],
  type: ExerciseType = 'weight_reps',
): number {
  return totalVolume(sets, type, { includeWarmups: false })
}
