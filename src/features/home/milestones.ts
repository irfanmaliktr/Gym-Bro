import type { ExerciseCatalogItem, SessionExercise, SetLog, WorkoutSession } from '../../db'
import { EMPTY_PR_STATE, evaluateSetsPrs, type PrKind, type PrSetInput, type PrState } from '../../lib/pr'

/**
 * Recent PR milestones for the Home dashboard (PROG-001/PROG-002).
 *
 * Records are **derived**, exactly like `lib/pr.ts` prescribes: sessions are
 * replayed in chronological order per exercise, and every set that beat the
 * running record produces an achievement. Nothing is stored, so editing history
 * (Phase 4) automatically corrects this list.
 *
 * Only achievements from *completed* sessions are considered, and only the most
 * recent achievement per (exercise, category) survives — otherwise a single
 * exercise would fill the whole carousel with its own history.
 */

/** i18n keys of PROG-001's four categories (`PrKind` in snake_case → UI keys). */
export type MilestoneKind = 'e1rm' | 'maxWeight' | 'maxReps' | 'maxVolumeSet'

const KIND_KEY: Record<PrKind, MilestoneKind> = {
  max_weight: 'maxWeight',
  max_reps: 'maxReps',
  max_volume_set: 'maxVolumeSet',
  e1rm: 'e1rm',
}

export interface Milestone {
  id: string
  kind: MilestoneKind
  exerciseId: string
  exerciseName: string
  /** kg for `maxWeight`/`e1rm`, kg·reps for `maxVolumeSet`, reps for `maxReps`. */
  value: number
  /** Weight of the achieving set — `0` for unloaded (bodyweight) sets. */
  weightKg: number
  reps: number
  /** The value this record replaced; `0` when it is the first of its kind. */
  previous: number
  achievedAt: number
  routineName: string
}

export const DEFAULT_MILESTONE_LIMIT = 6

export function deriveMilestones(
  sessions: readonly WorkoutSession[],
  sessionExercises: readonly SessionExercise[],
  setLogs: readonly SetLog[],
  catalogById: ReadonlyMap<string, ExerciseCatalogItem>,
  limit: number = DEFAULT_MILESTONE_LIMIT,
): Milestone[] {
  const completed = sessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => a.start_timestamp - b.start_timestamp)
  if (completed.length === 0) return []

  const logsByLink = groupBy(setLogs, (log) => log.session_exercise_id)
  const linksBySession = groupBy(sessionExercises, (link) => link.session_id)

  const states = new Map<string, PrState>()
  const latest = new Map<string, Milestone>()

  for (const session of completed) {
    const achievedAt = session.finish_timestamp ?? session.start_timestamp

    for (const link of linksBySession.get(session.id) ?? []) {
      const sets: PrSetInput[] = (logsByLink.get(link.id) ?? [])
        .filter((log) => log.is_completed !== false)
        .sort((a, b) => a.set_number - b.set_number)
        .map((log) => ({ weight_kg: log.weight_kg, reps: log.reps, is_completed: log.is_completed }))
      if (sets.length === 0) continue

      const type = catalogById.get(link.exercise_id)?.type ?? 'weight_reps'
      const evaluation = evaluateSetsPrs(sets, states.get(link.exercise_id) ?? EMPTY_PR_STATE, type)
      states.set(link.exercise_id, evaluation.state)

      for (const achievement of evaluation.achievements) {
        const key = `${link.exercise_id}|${achievement.kind}`
        latest.set(key, {
          id: `${link.id}-${achievement.kind}`,
          kind: KIND_KEY[achievement.kind],
          exerciseId: link.exercise_id,
          exerciseName: link.exercise_name_snap || catalogById.get(link.exercise_id)?.name || '',
          value: achievement.value,
          weightKg: achievement.weightKg,
          reps: achievement.reps,
          previous: achievement.previous,
          achievedAt,
          routineName: session.workout_name_snap,
        })
      }
    }
  }

  return [...latest.values()].sort((a, b) => b.achievedAt - a.achievedAt).slice(0, limit)
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = grouped.get(key)
    if (bucket) bucket.push(item)
    else grouped.set(key, [item])
  }
  return grouped
}
