import type { ExerciseType } from '../db/types'
import { roundTo } from './units'
import { setVolume, type VolumeSetLike } from './volume'

/**
 * Personal record evaluation (PROG-001, PROG-002).
 *
 * PRs are **derived**, never stored: PRD §8 defines no records table, so a
 * record is whatever the set history says it is. `buildPrState` folds history
 * into a comparable snapshot, and `evaluateSetPrs` reports which categories a
 * fresh set beats — that is everything LOG-010 / PROG-002 need to badge a set
 * during a live workout and in the completion summary.
 *
 * PROG-001 is applied literally: the heaviest weight for ≥1 rep counts even if
 * the set was flagged a warmup. Callers that want working-set-only records
 * should filter the input first.
 */

/** The four PRD record categories (PROG-001). */
export type PrKind = 'max_weight' | 'max_reps' | 'max_volume_set' | 'e1rm'

/**
 * Structural subset of `SetLog` needed for record math. `is_completed` is
 * optional so draft rows from the active screen can be evaluated; anything not
 * explicitly `false` counts as completed.
 */
export interface PrSetInput extends VolumeSetLike {
  is_completed?: boolean
}

/** Best known values for one exercise. All-zero means "no history". */
export interface PrState {
  /** Max Weight: heaviest weight lifted for ≥1 rep (kg). */
  maxWeight: number
  /**
   * Max Reps: best rep count per weight. Keyed by the exact weight in kg
   * because the record is defined "at a specific weight" (PROG-001).
   */
  maxRepsByWeight: Record<string, number>
  /** Max Volume Single Set: best `weight × reps` in one set (kg·reps). */
  maxVolumeSet: number
  /** Estimated 1RM: best Epley value (kg). */
  e1rm: number
}

export const EMPTY_PR_STATE: PrState = {
  maxWeight: 0,
  maxRepsByWeight: {},
  maxVolumeSet: 0,
  e1rm: 0,
}

/** A record beaten by one set. */
export interface PrAchievement {
  kind: PrKind
  /** New record value: kg for `max_weight`/`max_volume_set`/`e1rm`, reps for `max_reps`. */
  value: number
  /** The value it replaced; `0` means this is the first record of that kind. */
  previous: number
  weightKg: number
  reps: number
}

export interface PrEvaluation {
  achievements: PrAchievement[]
  state: PrState
}

/**
 * Epley formula from PROG-001: `E1RM = w × (1 + r / 30)`.
 * Returns `0` for unloaded (`w <= 0`) or non-positive-rep sets, which keeps
 * bodyweight movements out of the 1RM category.
 */
export function epley1Rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return 0
  if (weightKg <= 0 || reps <= 0) return 0
  return roundTo(weightKg * (1 + reps / 30), 2)
}

/** Weight/reps of a set, normalised (never negative, missing → 0). */
function normaliseSet(set: PrSetInput): { weightKg: number; reps: number; counted: boolean } {
  const counted =
    set.is_completed !== false &&
    typeof set.reps === 'number' &&
    Number.isFinite(set.reps) &&
    set.reps > 0
  const weightKg =
    typeof set.weight_kg === 'number' && Number.isFinite(set.weight_kg)
      ? Math.max(0, set.weight_kg)
      : 0
  return { weightKg, reps: counted ? (set.reps as number) : 0, counted }
}

/**
 * Compares one set against the current records of its exercise and returns the
 * categories it beats, in PROG-001 order.
 */
export function evaluateSetPrs(
  set: PrSetInput,
  state: PrState,
  type: ExerciseType = 'weight_reps',
): PrAchievement[] {
  const { weightKg, reps, counted } = normaliseSet(set)
  if (!counted) return []

  const achievements: PrAchievement[] = []

  if (weightKg > state.maxWeight) {
    achievements.push({
      kind: 'max_weight',
      value: weightKg,
      previous: state.maxWeight,
      weightKg,
      reps,
    })
  }

  // Max Reps is keyed by weight, so a first-time weight would otherwise badge
  // on every single set. The baseline is still recorded (see
  // `mergeSetIntoPrState`); only beating an existing rep count earns a badge,
  // and a heavier top set is already reported by `max_weight`.
  const repsKey = String(weightKg)
  const bestReps = state.maxRepsByWeight[repsKey] ?? 0
  if (bestReps > 0 && reps > bestReps) {
    achievements.push({
      kind: 'max_reps',
      value: reps,
      previous: bestReps,
      weightKg,
      reps,
    })
  }

  const volume = setVolume({ weight_kg: weightKg, reps, is_completed: true }, type)
  if (volume > state.maxVolumeSet) {
    achievements.push({
      kind: 'max_volume_set',
      value: volume,
      previous: state.maxVolumeSet,
      weightKg,
      reps,
    })
  }

  const e1rm = epley1Rm(weightKg, reps)
  if (e1rm > state.e1rm) {
    achievements.push({
      kind: 'e1rm',
      value: e1rm,
      previous: state.e1rm,
      weightKg,
      reps,
    })
  }

  return achievements
}

/** Returns a new state with one set folded in (immutably). */
export function mergeSetIntoPrState(
  state: PrState,
  set: PrSetInput,
  type: ExerciseType = 'weight_reps',
): PrState {
  const { weightKg, reps, counted } = normaliseSet(set)
  if (!counted) return state

  const repsKey = String(weightKg)
  const volume = setVolume({ weight_kg: weightKg, reps, is_completed: true }, type)
  const e1rm = epley1Rm(weightKg, reps)

  return {
    maxWeight: Math.max(state.maxWeight, weightKg),
    maxRepsByWeight:
      reps > (state.maxRepsByWeight[repsKey] ?? 0)
        ? { ...state.maxRepsByWeight, [repsKey]: reps }
        : state.maxRepsByWeight,
    maxVolumeSet: Math.max(state.maxVolumeSet, volume),
    e1rm: Math.max(state.e1rm, e1rm),
  }
}

/**
 * Folds a chronological list of sets (one exercise) into a record snapshot.
 * Used by the Progress tab and by PR evaluation against previous performance.
 */
export function buildPrState(
  sets: readonly PrSetInput[],
  type: ExerciseType = 'weight_reps',
  initial: PrState = EMPTY_PR_STATE,
): PrState {
  return sets.reduce((state, set) => mergeSetIntoPrState(state, set, type), initial)
}

/**
 * Evaluates a batch of sets (e.g. everything logged for one exercise in the
 * session being finished) and returns both the achievements and the state to
 * compare the next set against. Within the batch, later sets see the records
 * set by earlier ones, so a session reports each record only once.
 */
export function evaluateSetsPrs(
  sets: readonly PrSetInput[],
  state: PrState = EMPTY_PR_STATE,
  type: ExerciseType = 'weight_reps',
): PrEvaluation {
  const achievements: PrAchievement[] = []
  let next = state

  for (const set of sets) {
    achievements.push(...evaluateSetPrs(set, next, type))
    next = mergeSetIntoPrState(next, set, type)
  }

  return { achievements, state: next }
}
