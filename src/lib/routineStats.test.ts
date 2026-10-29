import { describe, expect, it } from 'vitest'
import type { ExerciseCatalogItem, RoutineExercise } from '../db/types'
import { formatRepTarget, summariseRoutine } from './routineStats'

const catalog = new Map<string, ExerciseCatalogItem>([
  ['ex_bench_press', { id: 'ex_bench_press', target_muscle: 'chest' } as ExerciseCatalogItem],
  ['ex_squat', { id: 'ex_squat', target_muscle: 'legs' } as ExerciseCatalogItem],
  ['ex_row', { id: 'ex_row', target_muscle: 'back' } as ExerciseCatalogItem],
])

function link(partial: Partial<RoutineExercise> & Pick<RoutineExercise, 'exercise_id'>): RoutineExercise {
  return {
    id: `link_${partial.exercise_id}`,
    routine_id: 'r1',
    display_order: 0,
    ...partial,
  } as RoutineExercise
}

describe('summariseRoutine', () => {
  it('counts exercises, working sets and distinct muscles in catalog order', () => {
    const summary = summariseRoutine(
      [
        link({ exercise_id: 'ex_squat', target_sets: 5 }),
        link({ exercise_id: 'ex_bench_press', target_sets: 4 }),
        link({ exercise_id: 'ex_row', target_sets: 3 }),
        link({ exercise_id: 'ex_bench_press', target_sets: 2 }), // duplicate muscle
      ],
      catalog,
    )

    expect(summary.exerciseCount).toBe(4)
    expect(summary.workingSets).toBe(14)
    // MUSCLE_ORDER is chest → back → legs …
    expect(summary.muscleGroups).toEqual(['chest', 'back', 'legs'])
  })

  it('ignores unknown exercises and missing set counts rather than guessing', () => {
    const summary = summariseRoutine(
      [link({ exercise_id: 'ex_missing', target_sets: 7 }), link({ exercise_id: 'ex_squat' })],
      catalog,
    )
    expect(summary.exerciseCount).toBe(2)
    expect(summary.workingSets).toBe(7)
    expect(summary.muscleGroups).toEqual(['legs'])
  })

  it('handles an empty routine', () => {
    expect(summariseRoutine([], catalog)).toEqual({ exerciseCount: 0, workingSets: 0, muscleGroups: [] })
  })
})

describe('formatRepTarget', () => {
  it('renders a range, a single value, or nothing', () => {
    expect(formatRepTarget(link({ exercise_id: 'a', target_reps_min: 8, target_reps_max: 12 }))).toBe('8–12')
    expect(formatRepTarget(link({ exercise_id: 'b', target_reps_min: 10, target_reps_max: 10 }))).toBe('10')
    expect(formatRepTarget(link({ exercise_id: 'c', target_reps_max: 15 }))).toBe('15')
    expect(formatRepTarget(link({ exercise_id: 'd' }))).toBe('')
  })
})
